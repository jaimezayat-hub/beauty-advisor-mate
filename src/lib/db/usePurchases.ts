import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapPurchase } from "./mappers";
import type { Purchase, Brand } from "@/lib/types";

export const purchasesKey = (filters?: unknown) =>
  ["purchases", filters ?? {}] as const;

export interface PurchasesFilter {
  brand?: Brand | "all";
  baId?: string | "all";
  from?: string;
  to?: string;
  consumerId?: string;
}

export function usePurchasesList(filters: PurchasesFilter, enabled = true) {
  return useQuery({
    queryKey: purchasesKey(filters),
    enabled,
    queryFn: async (): Promise<Purchase[]> => {
      let q = supabase
        .from("purchases")
        .select("*, purchase_items(*)")
        .is("deleted_at", null)
        .order("purchased_at", { ascending: false })
        .limit(500);
      if (filters.brand && filters.brand !== "all")
        q = q.eq("brand", filters.brand);
      if (filters.baId && filters.baId !== "all") q = q.eq("ba_id", filters.baId);
      if (filters.consumerId) q = q.eq("consumer_id", filters.consumerId);
      if (filters.from) q = q.gte("purchased_at", filters.from);
      if (filters.to) q = q.lte("purchased_at", filters.to + "T23:59:59");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((p: any) => mapPurchase(p, p.purchase_items ?? []));
    },
  });
}

export interface CreatePurchaseInput {
  purchase: Purchase;
  ticketFile?: File | null;
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ purchase, ticketFile }: CreatePurchaseInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("No hay sesión activa");

      // Resolve store from profile so RLS passes regardless of UI state
      const { data: prof } = await supabase
        .from("profiles")
        .select("store_id, brand")
        .eq("id", uid)
        .maybeSingle();
      const storeId = prof?.store_id ?? purchase.storeId;
      const brand = (prof?.brand ?? purchase.brand) as Brand;

      const { data: inserted, error } = await supabase
        .from("purchases")
        .insert({
          consumer_id: purchase.consumerId,
          ba_id: uid,
          store_id: storeId,
          brand,
          purchased_at: purchase.date,
          total: purchase.total,
          currency: "MXN",
          source: "manual",
          ticket_number: purchase.ticketNumber ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      const pid = inserted.id;

      if (purchase.lines.length) {
        const items = purchase.lines.map((l) => ({
          purchase_id: pid,
          sku_snapshot: l.sku,
          name_snapshot: l.name,
          qty: l.qty,
          unit_price: l.price,
          discount: 0,
        }));
        const { error: itemErr } = await supabase.from("purchase_items").insert(items);
        if (itemErr) throw itemErr;
      }

      if (ticketFile) {
        const path = `${pid}/${Date.now()}-${ticketFile.name}`;
        const up = await supabase.storage
          .from("tickets")
          .upload(path, ticketFile, { upsert: false });
        if (!up.error) {
          await supabase.from("tickets").insert({
            purchase_id: pid,
            storage_path: path,
            uploaded_by: uid,
          });
        }
      }

      return pid;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["consumers"] });
    },
  });
}
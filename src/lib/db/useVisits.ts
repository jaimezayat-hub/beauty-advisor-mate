import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapVisit } from "./mappers";
import type { Brand, Visit } from "@/lib/types";

export interface VisitReason {
  id: string;
  code: string;
  name: string;
}

export function useVisitReasons(enabled = true) {
  return useQuery({
    queryKey: ["visit_reasons"],
    enabled,
    queryFn: async (): Promise<VisitReason[]> => {
      const { data, error } = await supabase
        .from("visit_reasons")
        .select("id, code, name, active")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((r) => ({ id: r.id, code: r.code, name: r.name }));
    },
  });
}

export interface VisitsFilter {
  baId?: string;
  storeId?: string;
  consumerId?: string;
  limit?: number;
}

export interface VisitWithConsumer extends Visit {
  consumerName?: string;
}

export function useVisitsList(filters: VisitsFilter, enabled = true) {
  return useQuery({
    queryKey: ["visits", filters],
    enabled,
    queryFn: async (): Promise<VisitWithConsumer[]> => {
      let q = supabase
        .from("visits")
        .select(
          "*, visit_reasons(name, code), consumers(first_name, last_name)",
        )
        .order("visited_at", { ascending: false })
        .limit(filters.limit ?? 50);
      if (filters.baId) q = q.eq("ba_id", filters.baId);
      if (filters.storeId) q = q.eq("store_id", filters.storeId);
      if (filters.consumerId) q = q.eq("consumer_id", filters.consumerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...mapVisit(row, row.visit_reasons ?? undefined),
        consumerName: row.consumers
          ? `${row.consumers.first_name ?? ""} ${row.consumers.last_name ?? ""}`.trim()
          : undefined,
      }));
    },
  });
}

export interface CreateVisitInput {
  consumerId: string;
  visitedAt: string;
  durationMin?: number;
  reasonId?: string;
  appointmentId?: string;
  notes?: string;
}

export function useCreateVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVisitInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("No hay sesión activa");
      const { data: prof } = await supabase
        .from("profiles")
        .select("store_id, brand")
        .eq("id", uid)
        .maybeSingle();
      const brand = (prof?.brand ?? "lancome") as Brand;
      if (!prof?.store_id) throw new Error("Tu perfil no tiene tienda asignada");
      const row = {
        consumer_id: input.consumerId,
        ba_id: uid,
        store_id: prof.store_id,
        brand,
        visited_at: input.visitedAt,
        duration_min: input.durationMin ?? null,
        reason_id: input.reasonId ?? null,
        appointment_id: input.appointmentId ?? null,
        notes: input.notes ?? null,
      };
      const { data, error } = await supabase
        .from("visits")
        .insert(row)
        .select("*, visit_reasons(name, code)")
        .single();
      if (error) throw error;
      return mapVisit(data as any, (data as any).visit_reasons ?? undefined);
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["visits"] });
      qc.invalidateQueries({ queryKey: ["consumer-timeline", v.consumerId] });
    },
  });
}
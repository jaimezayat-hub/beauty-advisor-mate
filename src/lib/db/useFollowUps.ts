import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { followUpToInsert, mapFollowUp } from "./mappers";
import type { FollowUp } from "@/lib/types";

export const followUpsKey = (filters?: unknown) =>
  ["follow_ups", filters ?? {}] as const;

export interface FollowUpsFilter {
  baId?: string | "all";
  storeId?: string | "all";
  from?: string;
  to?: string;
}

export function useFollowUpsList(filters: FollowUpsFilter = {}, enabled = true) {
  return useQuery({
    queryKey: followUpsKey(filters),
    enabled,
    queryFn: async (): Promise<FollowUp[]> => {
      let q = supabase
        .from("follow_ups")
        .select("*")
        .order("due_at", { ascending: false })
        .limit(500);
      if (filters.baId && filters.baId !== "all") q = q.eq("ba_id", filters.baId);
      if (filters.storeId && filters.storeId !== "all") q = q.eq("store_id", filters.storeId);
      if (filters.from) q = q.gte("due_at", filters.from);
      if (filters.to) q = q.lte("due_at", filters.to);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(mapFollowUp);
    },
  });
}

export function useCreateFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (f: FollowUp) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("No hay sesión activa");
      const { data: prof } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", uid)
        .maybeSingle();
      const row = followUpToInsert({ ...f, baId: uid }, prof?.store_id ?? "");
      const { error } = await supabase.from("follow_ups").insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["follow_ups"] }),
  });
}

/** Plantillas activas para uso en UI. */
export function useFollowUpTemplates(enabled = true) {
  return useQuery({
    queryKey: ["follow_up_templates"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_up_templates")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Registra un mensaje WhatsApp enviado/copiado para una consumidor. */
export function useLogWhatsapp() {
  return useMutation({
    mutationFn: async (args: {
      consumerId: string;
      body: string;
      templateId?: string | null;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      const { error } = await supabase.from("whatsapp_messages").insert({
        consumer_id: args.consumerId,
        rendered_body: args.body,
        template_id: args.templateId ?? null,
        sent_by: uid ?? null,
        status: "stub",
      });
      if (error) throw error;
    },
  });
}
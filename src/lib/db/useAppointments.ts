import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { appointmentToInsert, mapAppointment } from "./mappers";
import type { Appointment, Brand } from "@/lib/types";

export const appointmentsKey = (filters?: unknown) =>
  ["appointments", filters ?? {}] as const;

export interface AppointmentsFilter {
  brand?: Brand | "all";
  baId?: string | "all";
  from?: string;
  to?: string;
}

export function useAppointmentsList(filters: AppointmentsFilter, enabled = true) {
  return useQuery({
    queryKey: appointmentsKey(filters),
    enabled,
    queryFn: async (): Promise<Appointment[]> => {
      let q = supabase
        .from("appointments")
        .select("*")
        .order("scheduled_at", { ascending: true })
        .limit(500);
      if (filters.brand && filters.brand !== "all") q = q.eq("brand", filters.brand);
      if (filters.baId && filters.baId !== "all") q = q.eq("ba_id", filters.baId);
      if (filters.from) q = q.gte("scheduled_at", filters.from);
      if (filters.to) q = q.lte("scheduled_at", filters.to);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(mapAppointment);
    },
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: Appointment) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("No hay sesión activa");
      const { data: prof } = await supabase
        .from("profiles")
        .select("store_id, brand")
        .eq("id", uid)
        .maybeSingle();
      const brand = (prof?.brand ?? "lancome") as Brand;
      const row = appointmentToInsert(
        { ...a, baId: uid, storeId: prof?.store_id ?? a.storeId },
        brand,
      );
      const { data, error } = await supabase
        .from("appointments")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return mapAppointment(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: status as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

/** Suscripción realtime que invalida queries al cambiar la tabla. */
export function useRealtimeInvalidate(
  table: "appointments" | "follow_ups" | "visits" | "notifications",
  invalidateKey: readonly unknown[],
  enabled = true,
) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const ch = supabase
      .channel(`rt-${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => qc.invalidateQueries({ queryKey: invalidateKey as any }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, enabled]);
}
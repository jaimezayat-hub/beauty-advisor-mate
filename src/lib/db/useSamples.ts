import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapSampleDelivery } from "./mappers";
import type { Sample } from "@/lib/types";

export const samplesKey = (filters?: unknown) =>
  ["sample_deliveries", filters ?? {}] as const;

/** Catálogo de muestras disponibles por marca. */
export function useSampleCatalog(brand: string, enabled = true) {
  return useQuery({
    queryKey: ["samples_catalog", brand],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("samples")
        .select("*")
        .eq("brand", brand as any)
        .eq("active", true);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSampleDeliveries(consumerId?: string, enabled = true) {
  return useQuery({
    queryKey: samplesKey({ consumerId }),
    enabled,
    queryFn: async (): Promise<Sample[]> => {
      let q = supabase
        .from("sample_deliveries")
        .select("*, samples(name, sku)")
        .order("delivered_at", { ascending: false })
        .limit(500);
      if (consumerId) q = q.eq("consumer_id", consumerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((d: any) =>
        mapSampleDelivery(d, { productName: d.samples?.name, sku: d.samples?.sku }),
      );
    },
  });
}

export function useCreateSampleDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { consumerId: string; sampleId: string; notes?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("No hay sesión activa");
      const { data: prof } = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", uid)
        .maybeSingle();
      const { error } = await supabase.from("sample_deliveries").insert({
        consumer_id: args.consumerId,
        sample_id: args.sampleId,
        ba_id: uid,
        store_id: prof?.store_id ?? "",
        notes: args.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sample_deliveries"] }),
  });
}
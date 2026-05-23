import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  mapConsumer,
  consumerToInserts,
  mapPurchase,
  mapAppointment,
  mapFollowUp,
  mapSampleDelivery,
} from "./mappers";
import type {
  Consumer,
  Segment,
  Purchase,
  Appointment,
  FollowUp,
  Sample,
  Message,
} from "@/lib/types";

export const consumersKey = (filters?: unknown) =>
  ["consumers", filters ?? {}] as const;
export const consumerKey = (id: string) => ["consumer", id] as const;

export interface ConsumersFilter {
  search?: string;
  segment?: Segment | "Todas";
  brand?: string;
}

/** Lista de consumidoras. RLS ya restringe por rol; aquí sólo se filtra por UI. */
export function useConsumersList(filters: ConsumersFilter, enabled = true) {
  return useQuery({
    queryKey: consumersKey(filters),
    enabled,
    queryFn: async (): Promise<Consumer[]> => {
      let q = supabase
        .from("consumers")
        .select("*")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(500);
      if (filters.brand) q = q.eq("brand", filters.brand as "lancome" | "ysl");
      if (filters.segment && filters.segment !== "Todas")
        q = q.eq("segment", filters.segment);
      if (filters.search?.trim()) {
        const s = `%${filters.search.trim()}%`;
        q = q.or(
          `first_name.ilike.${s},last_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((row) => mapConsumer({ consumer: row }));
    },
  });
}

/** Detalle de una consumidora con relaciones (consents, prefs, tags, notice). */
export function useConsumerDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: consumerKey(id ?? "none"),
    enabled: !!id && enabled,
    queryFn: async (): Promise<Consumer | null> => {
      if (!id) return null;
      const [c, consents, prefs, tags, notice] = await Promise.all([
        supabase.from("consumers").select("*").eq("id", id).maybeSingle(),
        supabase.from("consumer_consents").select("*").eq("consumer_id", id),
        supabase.from("consumer_preferences").select("*").eq("consumer_id", id),
        supabase.from("consumer_tags").select("*").eq("consumer_id", id),
        supabase
          .from("notice_acceptances")
          .select("*")
          .eq("consumer_id", id)
          .order("accepted_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (c.error) throw c.error;
      if (!c.data) return null;
      return mapConsumer({
        consumer: c.data,
        consents: consents.data ?? [],
        prefs: prefs.data ?? [],
        tags: tags.data ?? [],
        notice: notice.data,
      });
    },
  });
}

/** Crea una consumidora + consents + prefs + tags + aceptación de aviso. */
export function useCreateConsumer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Consumer) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("No hay sesión activa");

      const { consumerRow, consents, prefs, tags } = consumerToInserts(c, uid);
      const { data: inserted, error } = await supabase
        .from("consumers")
        .insert({ ...consumerRow, owner_ba_id: uid })
        .select()
        .single();
      if (error) throw error;
      const cid = inserted.id;

      const tasks: Promise<unknown>[] = [];
      if (consents.length)
        tasks.push(
          Promise.resolve(
            supabase
              .from("consumer_consents")
              .insert(consents.map((x) => ({ ...x, consumer_id: cid }))),
          ),
        );
      if (prefs.length)
        tasks.push(
          Promise.resolve(
            supabase
              .from("consumer_preferences")
              .insert(prefs.map((x) => ({ ...x, consumer_id: cid }))),
          ),
        );
      if (tags.length)
        tasks.push(
          Promise.resolve(
            supabase
              .from("consumer_tags")
              .insert(tags.map((tag) => ({ consumer_id: cid, tag }))),
          ),
        );

      // Aviso de privacidad vigente
      const { data: notice } = await supabase
        .from("privacy_notices")
        .select("id")
        .eq("brand", c.brand)
        .lte("effective_from", new Date().toISOString().slice(0, 10))
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (notice) {
        tasks.push(
          Promise.resolve(
            supabase.from("notice_acceptances").insert({
              consumer_id: cid,
              notice_id: notice.id,
              captured_by_ba: uid,
              signature_ref: c.privacy.signaturePng ?? null,
            }),
          ),
        );
      }

      await Promise.all(tasks);
      return cid;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consumers"] });
    },
  });
}

// ============================================================
// Timeline (purchases, appointments, follow-ups, samples, messages)
// ============================================================

export interface ConsumerTimeline {
  purchases: Purchase[];
  appointments: Appointment[];
  followUps: FollowUp[];
  samples: Sample[];
  messages: Message[];
  lastTransactionAt?: string;
}

/** Trae el timeline real de una consumidora desde Supabase. */
export function useConsumerTimeline(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["consumer-timeline", id ?? "none"],
    enabled: !!id && enabled,
    queryFn: async (): Promise<ConsumerTimeline> => {
      if (!id) {
        return { purchases: [], appointments: [], followUps: [], samples: [], messages: [] };
      }
      const [pur, appts, fups, samps, wa, sampleDefs] = await Promise.all([
        supabase
          .from("purchases")
          .select("*, purchase_items(*)")
          .eq("consumer_id", id)
          .is("deleted_at", null)
          .order("purchased_at", { ascending: false }),
        supabase
          .from("appointments")
          .select("*")
          .eq("consumer_id", id)
          .order("scheduled_at", { ascending: false }),
        supabase
          .from("follow_ups")
          .select("*")
          .eq("consumer_id", id)
          .order("due_at", { ascending: false }),
        supabase
          .from("sample_deliveries")
          .select("*")
          .eq("consumer_id", id)
          .order("delivered_at", { ascending: false }),
        supabase
          .from("whatsapp_messages")
          .select("*, whatsapp_templates(code)")
          .eq("consumer_id", id)
          .order("sent_at", { ascending: false }),
        supabase.from("samples").select("id,name,sku"),
      ]);

      const sampleMap = new Map(
        (sampleDefs.data ?? []).map((s) => [s.id, { name: s.name, sku: s.sku }]),
      );

      const purchases = (pur.data ?? []).map((p: any) =>
        mapPurchase(p, p.purchase_items ?? []),
      );
      const lastTransactionAt = purchases[0]?.date;

      return {
        purchases,
        appointments: (appts.data ?? []).map(mapAppointment),
        followUps: (fups.data ?? []).map(mapFollowUp),
        samples: (samps.data ?? []).map((d) =>
          mapSampleDelivery(d, sampleMap.get(d.sample_id)),
        ),
        messages: (wa.data ?? []).map((m: any) => ({
          id: m.id,
          consumerId: m.consumer_id,
          baId: m.sent_by ?? "",
          date: m.sent_at,
          templateType: m.whatsapp_templates?.code ?? "WhatsApp",
          content: m.rendered_body,
          channel: "WhatsApp" as const,
        })),
        lastTransactionAt,
      };
    },
  });
}
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type KpiPeriod = "semana" | "mes" | "trimestre";

function startISO(period: KpiPeriod, d = new Date()): string {
  const x = new Date(d);
  if (period === "semana") {
    x.setDate(x.getDate() - 7);
    x.setHours(0, 0, 0, 0);
    return x.toISOString();
  }
  if (period === "trimestre") {
    x.setMonth(x.getMonth() - 3);
    x.setHours(0, 0, 0, 0);
    return x.toISOString();
  }
  // mes: inicio del mes actual
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export type KpiSummary = {
  sales: number;
  transactions: number;
  avgTicket: number;
  newConsumers: number;
  followupsCompleted: number;
  followupsPending: number;
  apptCompleted: number;
  apptCancelled: number;
  apptNoShow: number;
  apptUpcoming: number;
  apptTotal: number;
  samplesDelivered: number;
  samplesConverted: number;
};

/**
 * Reads monthly KPI views. Returns aggregated totals for the current month
 * within the user's RLS scope (BA -> self, manager -> store, supervisor -> region).
 */
export function usePerformanceKpis(enabled: boolean, period: KpiPeriod = "mes") {
  const fromISO = startISO(period);
  return useQuery({
    enabled,
    queryKey: ["kpis", period, fromISO],
    queryFn: async (): Promise<KpiSummary> => {
      const sb = supabase as any;
      const fromDate = fromISO.slice(0, 10);
      const [purchases, consumers, fups, appts, samples] = await Promise.all([
        sb.from("purchases").select("total").is("deleted_at", null).gte("purchased_at", fromISO),
        sb.from("consumers").select("id", { count: "exact", head: false }).is("deleted_at", null).gte("created_at", fromISO),
        sb.from("follow_ups").select("outcome,completed_at,due_at").gte("due_at", fromISO),
        sb.from("appointments").select("status,scheduled_at").gte("scheduled_at", fromISO),
        sb.from("sample_deliveries").select("id,converted_purchase_id").gte("delivered_at", fromISO),
      ]);
      const purchRows: any[] = purchases.data ?? [];
      const tx = purchRows.length;
      const total = purchRows.reduce((s, r) => s + Number(r.total ?? 0), 0);
      const fupRows: any[] = fups.data ?? [];
      const apptRows: any[] = appts.data ?? [];
      const sampRows: any[] = samples.data ?? [];
      const now = Date.now();
      return {
        sales: total,
        transactions: tx,
        avgTicket: tx > 0 ? total / tx : 0,
        newConsumers: (consumers.data ?? []).length,
        followupsCompleted: fupRows.filter((r) => r.completed_at).length,
        followupsPending: fupRows.filter((r) => !r.completed_at).length,
        apptCompleted: apptRows.filter((r) => r.status === "done").length,
        apptCancelled: apptRows.filter((r) => r.status === "cancelled").length,
        apptNoShow: apptRows.filter((r) => r.status === "no_show").length,
        apptUpcoming: apptRows.filter((r) => new Date(r.scheduled_at).getTime() > now).length,
        apptTotal: apptRows.length,
        samplesDelivered: sampRows.length,
        samplesConverted: sampRows.filter((r) => r.converted_purchase_id).length,
      };
    },
  });
}
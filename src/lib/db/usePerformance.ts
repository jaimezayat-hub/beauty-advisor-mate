import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function startOfMonthISO(d = new Date()) {
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
export function usePerformanceKpis(enabled: boolean) {
  const month = startOfMonthISO();
  return useQuery({
    enabled,
    queryKey: ["kpis", month],
    queryFn: async (): Promise<KpiSummary> => {
      const sb = supabase as any;
      const [sales, consumers, fups, appts, samples] = await Promise.all([
        sb.from("v_sales_by_ba_month").select("*").eq("month", month),
        sb.from("v_consumers_by_ba_month").select("*").eq("month", month),
        sb.from("v_followups_by_ba_month").select("*").eq("month", month),
        sb.from("v_appointments_by_ba_month").select("*").eq("month", month),
        sb.from("v_samples_by_ba_month").select("*").eq("month", month),
      ]);
      const sum = (rows: any[] | null, k: string) =>
        (rows ?? []).reduce((s, r) => s + Number(r[k] ?? 0), 0);
      const tx = sum(sales.data, "transactions");
      const total = sum(sales.data, "sales");
      return {
        sales: total,
        transactions: tx,
        avgTicket: tx > 0 ? total / tx : 0,
        newConsumers: sum(consumers.data, "new_consumers"),
        followupsCompleted: sum(fups.data, "completed"),
        followupsPending: sum(fups.data, "pending"),
        apptCompleted: sum(appts.data, "completed"),
        apptCancelled: sum(appts.data, "cancelled"),
        apptNoShow: sum(appts.data, "no_show"),
        apptUpcoming: sum(appts.data, "upcoming"),
        apptTotal: sum(appts.data, "total"),
        samplesDelivered: sum(samples.data, "delivered"),
        samplesConverted: sum(samples.data, "converted"),
      };
    },
  });
}
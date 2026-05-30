import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BaKpiProfile, Brand } from "@/lib/types";

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
  profiles: BaKpiProfile[];
};

export type PerformanceCategory = "all" | "Skincare" | "Makeup" | "Fragancia";

export interface PerformanceFilters {
  from?: string;
  to?: string;
  brand?: Brand | "all";
  baId?: string | "all";
  storeId?: string | "all";
  category?: PerformanceCategory;
}

/**
 * Reads monthly KPI views. Returns aggregated totals for the current month
 * within the user's RLS scope (BA -> self, manager -> store, supervisor -> region).
 */
export function usePerformanceKpis(
  enabled: boolean,
  period: KpiPeriod = "mes",
  filters: PerformanceFilters = {},
) {
  const fromISO = filters.from ?? startISO(period);
  const toISO = filters.to;
  return useQuery({
    enabled,
    queryKey: ["kpis", period, fromISO, toISO, filters],
    queryFn: async (): Promise<KpiSummary> => {
      const sb = supabase as any;
      const category = filters.category ?? "all";
      const applyShared = (q: any, dateColumn: string) => {
        let next = q.gte(dateColumn, fromISO);
        if (toISO) next = next.lte(dateColumn, toISO);
        if (filters.brand && filters.brand !== "all") next = next.eq("brand", filters.brand);
        if (filters.baId && filters.baId !== "all") next = next.eq("ba_id", filters.baId);
        if (filters.storeId && filters.storeId !== "all") next = next.eq("store_id", filters.storeId);
        return next;
      };
      const [purchases, consumers, fups, appts, samples] = await Promise.all([
        applyShared(
          sb.from("purchases").select("id,total,ba_id,store_id,brand,purchased_at,purchase_items(qty,unit_price,sku_snapshot,products(category))").is("deleted_at", null),
          "purchased_at",
        ),
        (() => {
          let q = sb.from("consumers").select("id,owner_ba_id,store_id,brand,created_at", { count: "exact", head: false }).is("deleted_at", null).gte("created_at", fromISO);
          if (toISO) q = q.lte("created_at", toISO);
          if (filters.brand && filters.brand !== "all") q = q.eq("brand", filters.brand);
          if (filters.baId && filters.baId !== "all") q = q.eq("owner_ba_id", filters.baId);
          if (filters.storeId && filters.storeId !== "all") q = q.eq("store_id", filters.storeId);
          return q;
        })(),
        applyShared(sb.from("follow_ups").select("id,ba_id,store_id,outcome,completed_at,due_at"), "due_at"),
        applyShared(sb.from("appointments").select("id,ba_id,store_id,status,scheduled_at"), "scheduled_at"),
        applyShared(sb.from("sample_deliveries").select("id,ba_id,store_id,converted_purchase_id,delivered_at"), "delivered_at"),
      ]);
      const purchRows: any[] = purchases.data ?? [];
      const purchaseAmount = (r: any) => amountForCategory(r, category);
      const relevantPurchases = purchRows.filter((r) => purchaseAmount(r) > 0);
      const tx = relevantPurchases.length;
      const total = relevantPurchases.reduce((s, r) => s + purchaseAmount(r), 0);
      const fupRows: any[] = fups.data ?? [];
      const apptRows: any[] = appts.data ?? [];
      const sampRows: any[] = samples.data ?? [];
      const consumerRows: any[] = consumers.data ?? [];
      const now = Date.now();
      const profiles = buildProfiles({
        purchases: relevantPurchases,
        purchaseAmount,
        consumers: consumerRows,
        followUps: fupRows,
        appointments: apptRows,
        samples: sampRows,
        fromISO,
        toISO: toISO ?? new Date().toISOString(),
      });
      return {
        sales: total,
        transactions: tx,
        avgTicket: tx > 0 ? total / tx : 0,
        newConsumers: consumerRows.length,
        followupsCompleted: fupRows.filter((r) => r.completed_at).length,
        followupsPending: fupRows.filter((r) => !r.completed_at).length,
        apptCompleted: apptRows.filter((r) => r.status === "done").length,
        apptCancelled: apptRows.filter((r) => r.status === "cancelled").length,
        apptNoShow: apptRows.filter((r) => r.status === "no_show").length,
        apptUpcoming: apptRows.filter((r) => new Date(r.scheduled_at).getTime() > now).length,
        apptTotal: apptRows.length,
        samplesDelivered: sampRows.length,
        samplesConverted: sampRows.filter((r) => r.converted_purchase_id).length,
        profiles,
      };
    },
  });
}

function normalizeCategory(value: unknown): PerformanceCategory | undefined {
  const v = String(value ?? "").toLowerCase();
  if (v.includes("skin") || v.includes("tratamiento")) return "Skincare";
  if (v.includes("frag") || v.includes("perfume")) return "Fragancia";
  if (v.includes("make") || v.includes("maquillaje")) return "Makeup";
  return undefined;
}

function categoryFromSku(sku: string): PerformanceCategory {
  if (/AGV|RNM|PUR/i.test(sku)) return "Skincare";
  if (/LAV|IDO|LIB|MYS/i.test(sku)) return "Fragancia";
  return "Makeup";
}

function amountForCategory(purchase: any, category: PerformanceCategory) {
  if (category === "all") return Number(purchase.total ?? 0);
  const items: any[] = purchase.purchase_items ?? [];
  return items.reduce((sum, item) => {
    const itemCategory = normalizeCategory(item.products?.category) ?? categoryFromSku(item.sku_snapshot ?? "");
    return itemCategory === category ? sum + Number(item.unit_price ?? 0) * Number(item.qty ?? 1) : sum;
  }, 0);
}

function buildProfiles(args: {
  purchases: any[];
  purchaseAmount: (row: any) => number;
  consumers: any[];
  followUps: any[];
  appointments: any[];
  samples: any[];
  fromISO: string;
  toISO: string;
}): BaKpiProfile[] {
  const baIds = new Set<string>();
  [...args.purchases, ...args.followUps, ...args.appointments, ...args.samples].forEach((r) => r.ba_id && baIds.add(r.ba_id));
  args.consumers.forEach((r) => r.owner_ba_id && baIds.add(r.owner_ba_id));
  const rangeDays = Math.max(1, Math.ceil((new Date(args.toISO).getTime() - new Date(args.fromISO).getTime()) / 86400000));
  const workDays = countWeekdays(args.fromISO, args.toISO);
  const weekly = (baId: string) => buildHistory(baId, args.purchases, args.consumers, args.purchaseAmount, args.toISO);
  const profiles = Array.from(baIds).map((baId) => {
    const purchases = args.purchases.filter((r) => r.ba_id === baId);
    const sales = purchases.reduce((s, r) => s + args.purchaseAmount(r), 0);
    const consumers = args.consumers.filter((r) => r.owner_ba_id === baId);
    const followUps = args.followUps.filter((r) => r.ba_id === baId);
    const appointments = args.appointments.filter((r) => r.ba_id === baId);
    const samples = args.samples.filter((r) => r.ba_id === baId);
    const activeDates = new Set<string>();
    purchases.forEach((r) => activeDates.add(String(r.purchased_at).slice(0, 10)));
    followUps.forEach((r) => activeDates.add(String(r.due_at).slice(0, 10)));
    appointments.forEach((r) => activeDates.add(String(r.scheduled_at).slice(0, 10)));
    samples.forEach((r) => activeDates.add(String(r.delivered_at).slice(0, 10)));
    const firstStore = purchases[0]?.store_id ?? consumers[0]?.store_id ?? followUps[0]?.store_id ?? appointments[0]?.store_id ?? "";
    const firstBrand = purchases[0]?.brand ?? consumers[0]?.brand ?? "lancome";
    const followUpsCompleted = followUps.filter((r) => r.completed_at).length;
    const followUpsPending = followUps.filter((r) => !r.completed_at).length;
    const apptCompleted = appointments.filter((r) => r.status === "done").length;
    const apptCancelled = appointments.filter((r) => r.status === "cancelled").length;
    const adoptionScore = Math.min(100, Math.round(((activeDates.size / Math.max(1, Math.min(workDays, rangeDays))) * 70) + (followUpsCompleted ? 15 : 0) + (consumers.length ? 15 : 0)));
    return {
      baId,
      baName: `BA ${baId.slice(0, 8)}`,
      storeId: firstStore,
      brand: firstBrand,
      monthlyTarget: Math.max(1, Math.round((250000 * rangeDays) / 30)),
      newConsumerTarget: Math.max(1, Math.round((16 * rangeDays) / 30)),
      activeDays: activeDates.size,
      workDays,
      followUpsCompleted,
      followUpsPending,
      birthdaysContacted: 0,
      birthdaysTotal: 0,
      replenishmentsActivated: samples.filter((r) => r.converted_purchase_id).length,
      appointmentsScheduled: appointments.length,
      appointmentsCompleted: apptCompleted,
      appointmentsCancelled: apptCancelled,
      adoptionScore,
      rank: 1,
      rankTotal: 1,
      categorySales: categorySales(purchases),
      history: weekly(baId),
    };
  });
  const ranked = profiles.sort((a, b) => b.history.reduce((s, w) => s + w.sales, 0) - a.history.reduce((s, w) => s + w.sales, 0));
  return ranked.map((p, i) => ({ ...p, rank: i + 1, rankTotal: ranked.length }));
}

function categorySales(purchases: any[]) {
  const out = { Skincare: 0, Makeup: 0, Fragancia: 0 };
  purchases.forEach((p) => (p.purchase_items ?? []).forEach((item: any) => {
    const c = normalizeCategory(item.products?.category) ?? categoryFromSku(item.sku_snapshot ?? "");
    if (c && c !== "all") out[c] += Number(item.unit_price ?? 0) * Number(item.qty ?? 1);
  }));
  return out;
}

function buildHistory(baId: string, purchases: any[], consumers: any[], purchaseAmount: (row: any) => number, toISO: string) {
  return Array.from({ length: 8 }, (_, idx) => {
    const end = new Date(toISO);
    end.setDate(end.getDate() - (7 - idx) * 7);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const p = purchases.filter((r) => r.ba_id === baId && within(r.purchased_at, start, end));
    const c = consumers.filter((r) => r.owner_ba_id === baId && within(r.created_at, start, end));
    return {
      week: `S${idx + 1}`,
      sales: p.reduce((s, r) => s + purchaseAmount(r), 0),
      salesTarget: 62500,
      newConsumers: c.length,
      recommendations: 0,
      convertedRecommendations: 0,
    };
  });
}

function within(value: string, start: Date, end: Date) {
  const t = new Date(value).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function countWeekdays(fromISO: string, toISO: string) {
  const start = new Date(fromISO);
  const end = new Date(toISO);
  let count = 0;
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return Math.max(1, count);
}
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp, useCurrentUser } from "@/store/useApp";
import { useConsumersList } from "@/lib/db/useConsumers";
import { usePurchasesList } from "@/lib/db/usePurchases";
import { useAppointmentsList } from "@/lib/db/useAppointments";
import { useFollowUpsList } from "@/lib/db/useFollowUps";
import { useVisitsList } from "@/lib/db/useVisits";
import { useReportGoals } from "@/lib/db/useGoals";
import { PageHeader } from "@/components/clienteling/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SegmentBadge } from "@/components/clienteling/SegmentBadge";
import {
  ReportFilters,
  defaultFilters,
  type ReportFiltersValue,
} from "@/components/clienteling/ReportFilters";
import {
  CalendarDays,
  Download,
  HeartPulse,
  PercentDiamond,
  Store as StoreIcon,
  TrendingUp,
  Users,
} from "lucide-react";
import { downloadCSV } from "@/lib/csv";
import { formatDate, formatDateTime, formatMoney, fullName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getScope, inScope } from "@/lib/permissions";
import type {
  Appointment,
  Consumer,
  FollowUp,
  Purchase,
  Store,
  User,
} from "@/lib/types";

const TABS = [
  ["dashboard", "Dashboard"],
  ["citas", "Agenda y Citas"],
  ["conversion", "Conversión"],
  ["adopcion", "Adopción"],
  ["retencion", "Retención"],
  ["consumidores", "Lista Consumidores"],
  ["ba", "Desempeño BA"],
] as const;

type TabKey = (typeof TABS)[number][0];

const COLORS = ["hsl(var(--primary))", "hsl(var(--gold))", "hsl(var(--brand-accent))"];

export default function Reports() {
  const user = useCurrentUser()!;
  const {
    consumers: seedConsumers,
    purchases: seedPurchases,
    users,
    appointments: seedAppointments,
    followUps: seedFollowUps,
    recommendations,
    stores,
    isRealSession,
  } = useApp();

  const scope = getScope(user);
  const [filters, setFilters] = useState<ReportFiltersValue>(defaultFilters);
  const queryFilters = {
    brand: filters.brand,
    baId: filters.baId,
    storeId: filters.storeId,
    from: filters.from.toISOString(),
    to: filters.to.toISOString(),
  };

  const dbConsumers = useConsumersList(queryFilters, isRealSession);
  const dbPurchases = usePurchasesList(queryFilters, isRealSession);
  const dbAppts = useAppointmentsList(queryFilters, isRealSession);
  const dbFollowUps = useFollowUpsList(queryFilters, isRealSession);
  const dbVisits = useVisitsList({ ...queryFilters, limit: 500 }, isRealSession);

  const allConsumers = isRealSession ? (dbConsumers.data ?? []) : seedConsumers;
  const allPurchases = isRealSession ? (dbPurchases.data ?? []) : seedPurchases;
  const allAppointments = isRealSession ? (dbAppts.data ?? []) : seedAppointments;
  const allFollowUps = isRealSession ? (dbFollowUps.data ?? []) : seedFollowUps;
  const allVisits = isRealSession ? (dbVisits.data ?? []) : [];

  const regions = useMemo(
    () => Array.from(new Set(stores.map((s) => s.region))).sort(),
    [stores],
  );

  const goals = useReportGoals(
    {
      brand: filters.brand,
      storeId: filters.storeId,
      region: filters.region,
      baId: filters.baId,
      from: filters.from.toISOString(),
      to: filters.to.toISOString(),
    },
    isRealSession,
  );

  const storeIdToRegion = useMemo(
    () => Object.fromEntries(stores.map((s) => [s.id, s.region])),
    [stores],
  );
  const storeIdToChain = useMemo(
    () => Object.fromEntries(stores.map((s) => [s.id, s.chain])),
    [stores],
  );
  const baToStoreId = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u.storeId])),
    [users],
  );

  // BAs visibles según scope + filtros
  const visibleBas = useMemo(() => {
    let bas: { id: string; name: string; brand: string; storeId: string }[] = [];
    if (isRealSession) {
      const byId = new Map<string, (typeof bas)[number]>();
      const addBa = (id: string, brand: string, storeId: string) => {
        if (!id || byId.has(id)) return;
        const known = users.find((u) => u.id === id);
        byId.set(id, {
          id,
          name: known?.name ?? `BA · ${brand === "ysl" ? "YSL" : "Lancôme"} · ${storeId.split("-").pop() ?? ""}`,
          brand: known?.brand ?? brand,
          storeId: known?.storeId ?? storeId,
        });
      };
      for (const c of allConsumers) {
        addBa(c.assignedBaId, c.brand, c.storeId);
      }
      allPurchases.forEach((p) => addBa(p.baId, p.brand, p.storeId));
      allAppointments.forEach((a) => addBa(a.baId, user.brand, a.storeId));
      allVisits.forEach((v) => addBa(v.baId, v.brand, v.storeId));
      bas = Array.from(byId.values());
    } else {
      bas = users
        .filter((u) => u.role === "ba")
        .map((u) => ({ id: u.id, name: u.name, brand: u.brand, storeId: u.storeId }));
    }
    return bas.filter((b) => {
      if (filters.brand !== "all" && b.brand !== filters.brand) return false;
      if (filters.storeId !== "all" && b.storeId !== filters.storeId) return false;
      if (filters.chain !== "all" && storeIdToChain[b.storeId] !== filters.chain) return false;
      if (filters.region !== "all" && storeIdToRegion[b.storeId] !== filters.region) return false;
      if (filters.baId !== "all" && b.id !== filters.baId) return false;
      // scope guard
      if (scope.kind === "self" && b.id !== scope.userId) return false;
      if (scope.kind === "store" && b.storeId !== scope.storeId) return false;
      if (scope.kind === "region" && storeIdToRegion[b.storeId] !== scope.region) return false;
      return true;
    });
  }, [isRealSession, allConsumers, allPurchases, allAppointments, allVisits, users, filters, storeIdToChain, storeIdToRegion, scope, user.brand]);

  const visibleBaIds = useMemo(() => new Set(visibleBas.map((b) => b.id)), [visibleBas]);

  // Predicate compartido por todo: scope + filtros + rango
  const inDateRange = (iso?: string) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= filters.from.getTime() && t <= filters.to.getTime();
  };

  const passesScope = (rec: { baId?: string; storeId?: string; brand?: string }) => {
    if (!inScope(scope, rec, { baToStoreId, storeIdToRegion })) return false;
    if (filters.brand !== "all" && rec.brand && rec.brand !== filters.brand) return false;
    if (filters.storeId !== "all" && rec.storeId && rec.storeId !== filters.storeId) return false;
    if (filters.chain !== "all") {
      const sid = rec.storeId ?? (rec.baId ? baToStoreId[rec.baId] : undefined);
      if (!sid || storeIdToChain[sid] !== filters.chain) return false;
    }
    if (filters.region !== "all") {
      const sid = rec.storeId ?? (rec.baId ? baToStoreId[rec.baId] : undefined);
      if (!sid || storeIdToRegion[sid] !== filters.region) return false;
    }
    if (filters.baId !== "all" && rec.baId !== filters.baId) return false;
    return true;
  };

  // Dataset filtrado
  const consumers = useMemo(
    () =>
      allConsumers.filter((c) =>
        passesScope({ baId: c.assignedBaId, storeId: c.storeId, brand: c.brand }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allConsumers, filters, scope],
  );

  const purchases = useMemo(
    () =>
      allPurchases
        .filter(
          (p) =>
            passesScope({ baId: p.baId, storeId: p.storeId, brand: p.brand }) &&
            inDateRange(p.date),
        )
        .map((p) => applyCategoryToPurchase(p, filters.category))
        .filter((p) => p.total > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allPurchases, filters, scope],
  );

  const appointments = useMemo(
    () =>
      allAppointments.filter(
        (a) =>
          passesScope({ baId: a.baId, storeId: a.storeId }) && inDateRange(a.date),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allAppointments, filters, scope],
  );

  const followUps = useMemo(
    () =>
      allFollowUps.filter((f) => passesScope({ baId: f.baId }) && inDateRange(f.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allFollowUps, filters, scope],
  );

  const visits = useMemo(
    () =>
      allVisits.filter(
        (v) => passesScope({ baId: v.baId, storeId: v.storeId, brand: v.brand }) && inDateRange(v.visitedAt),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allVisits, filters, scope],
  );

  const newConsumers = useMemo(
    () => consumers.filter((c) => inDateRange(c.createdAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [consumers, filters],
  );

  // KPIs base (RF-38)
  const sellOut = purchases.reduce((s, p) => s + p.total, 0);
  const targetMx = goals.data?.sellOutTarget && goals.data.sellOutTarget > 0
    ? goals.data.sellOutTarget
    : fallbackTarget(filters, visibleBas.length);
  const targetPct = targetMx > 0 ? Math.min(100, Math.round((sellOut / targetMx) * 100)) : 0;
  const avgTicket = purchases.length > 0 ? sellOut / purchases.length : 0;

  // RF-39 — Citas
  const apptStats = useMemo(() => computeApptStats(appointments, allAppointments, filters), [
    appointments,
    allAppointments,
    filters,
  ]);

  // Top tiendas / marcas (RF-42)
  const topStores = useMemo(() => {
    const map = new Map<string, number>();
    purchases.forEach((p) => map.set(p.storeId, (map.get(p.storeId) ?? 0) + p.total));
    return Array.from(map.entries())
      .map(([id, total]) => ({
        id,
        name: stores.find((s) => s.id === id)?.name ?? id,
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [purchases, stores]);

  const brandsMix = useMemo(() => {
    let l = 0,
      y = 0;
    purchases.forEach((p) => {
      if (p.brand === "lancome") l += p.total;
      else y += p.total;
    });
    return [
      { name: "Lancôme", value: Math.round(l) },
      { name: "YSL", value: Math.round(y) },
    ];
  }, [purchases]);

  // category mix
  const catMix = useMemo(() => {
    let s = 0,
      m = 0,
      f = 0;
    purchases.forEach((p) =>
      p.lines.forEach((l) => {
        const sku = l.sku;
        const amt = l.price * l.qty;
        if (sku.includes("AGV") || sku.includes("RNM") || sku.includes("PUR")) s += amt;
        else if (
          sku.includes("LAV") ||
          sku.includes("IDO") ||
          sku.includes("LIB") ||
          sku.includes("MYS")
        )
          f += amt;
        else m += amt;
      }),
    );
    return [
      { name: "Skincare", value: Math.round(s) },
      { name: "Makeup", value: Math.round(m) },
      { name: "Fragancia", value: Math.round(f) },
    ];
  }, [purchases]);

  // Sales por BA
  const salesByBa = visibleBas.map((b) => ({
    name: b.name.split(" ")[0],
    ventas: purchases.filter((p) => p.baId === b.id).reduce((s, p) => s + p.total, 0),
  }));

  // Tendencia 8 semanas (siempre relativa al rango)
  const weeks = useMemo(() => buildWeeklySeries(consumers, purchases, visibleBas.length, filters), [
    consumers,
    purchases,
    visibleBas.length,
    filters,
  ]);

  // Adopción
  const todayKey = new Date().toDateString();
  const baActiveToday = new Set(
    purchases.filter((p) => new Date(p.date).toDateString() === todayKey).map((p) => p.baId),
  );
  const baActiveRange = new Set(purchases.map((p) => p.baId));
  const adoptionToday = visibleBas.length
    ? Math.round((baActiveToday.size / visibleBas.length) * 100)
    : 0;
  const adoptionRange = visibleBas.length
    ? Math.round((baActiveRange.size / visibleBas.length) * 100)
    : 0;

  // Retención
  const now = Date.now();
  const dayMs = 86400000;
  const lastTxByCons = useMemo(() => {
    const m = new Map<string, number>();
    allPurchases.forEach((p) => {
      const t = new Date(p.date).getTime();
      if (!m.has(p.consumerId) || (m.get(p.consumerId) ?? 0) < t) m.set(p.consumerId, t);
    });
    return m;
  }, [allPurchases]);
  const consumerStatus = useMemo(
    () =>
      consumers.map((c) => {
        const lt =
          lastTxByCons.get(c.id) ??
          new Date(c.lastTransactionAt ?? c.createdAt).getTime();
        const days = Math.floor((now - lt) / dayMs);
        let bucket: "Activas" | "Tibias" | "En riesgo" | "Perdidas";
        if (days <= 60) bucket = "Activas";
        else if (days <= 120) bucket = "Tibias";
        else if (days <= 180) bucket = "En riesgo";
        else bucket = "Perdidas";
        return { c, days, bucket };
      }),
    [consumers, lastTxByCons, now],
  );
  const retention = (["Activas", "Tibias", "En riesgo", "Perdidas"] as const).map((b) => ({
    name: b,
    value: consumerStatus.filter((x) => x.bucket === b).length,
  }));
  const retentionTotal = consumerStatus.length || 1;
  const reactivationList = consumerStatus
    .filter((x) => x.bucket === "En riesgo" || x.bucket === "Tibias")
    .sort((a, b) => b.days - a.days)
    .slice(0, 12);

  // RF-46 Conversión
  const conversion = useMemo(
    () => computeConversion(visits, followUps, recommendations, purchases, visibleBaIds),
    [visits, followUps, recommendations, purchases, visibleBaIds],
  );

  // RF-41 — último seguimiento por consumidor
  const lastFuByConsumer = useMemo(() => {
    const m = new Map<string, FollowUp>();
    allFollowUps.forEach((f) => {
      const cur = m.get(f.consumerId);
      if (!cur || new Date(cur.date).getTime() < new Date(f.date).getTime()) m.set(f.consumerId, f);
    });
    return m;
  }, [allFollowUps]);

  // RF-43 Desempeño BA
  const baPerf = visibleBas.map((b) => {
    const tx = purchases.filter((p) => p.baId === b.id);
    const recs = recommendations.filter((r) => r.baId === b.id && inDateRange(r.date));
    const fups = followUps.filter((f) => f.baId === b.id);
    const visit = visits.filter((v) => v.baId === b.id);
    const newC = consumers.filter((c) => c.assignedBaId === b.id && inDateRange(c.createdAt));
    const adoption = baActiveRange.has(b.id) ? "Alta" : adoptionRange > 0 ? "Media" : "Baja";
    return {
      ba: b,
      tx: tx.length,
      total: tx.reduce((s, p) => s + p.total, 0),
      newC: newC.length,
      fups: fups.length,
      recs: recs.length,
      visits: visit.length,
      adoption,
    };
  });

  const lookupBa = (id: string | undefined) =>
    visibleBas.find((b) => b.id === id) ??
    users.find((u) => u.id === id) ??
    (id ? { id, name: id, brand: "", storeId: "" } : undefined);

  const [tab, setTab] = useState<TabKey>("dashboard");

  // Exports
  const exportConsumers = () => {
    const rows = consumers.map((c) => {
      const ba = lookupBa(c.assignedBaId);
      const lastFu = lastFuByConsumer.get(c.id);
      return {
        Nombre: c.firstName,
        Apellido: c.lastName,
        Teléfono: c.phone,
        Correo: c.email,
        FechaNacimiento: formatDate(c.birthDate),
        Segmento: c.segment,
        Marca: c.brand === "ysl" ? "YSL" : "Lancôme",
        Tienda: stores.find((s) => s.id === c.storeId)?.name ?? c.storeId,
        BA: ba?.name ?? "",
        ClientaDesde: formatDate(c.createdAt),
        ÚltimoContacto: formatDate(c.lastContactAt),
        ÚltimaTransacción: formatDate(c.lastTransactionAt),
        TipoSeguimiento: lastFu?.type ?? "",
      };
    });
    downloadCSV(`consumidores_${stamp()}`, rows);
    toast.success("Lista exportada");
  };

  const exportBaPerf = () => {
    const rows = baPerf.map((r) => ({
      BA: r.ba.name,
      Marca: r.ba.brand === "ysl" ? "YSL" : "Lancôme",
      Tienda: stores.find((s) => s.id === r.ba.storeId)?.name ?? r.ba.storeId,
      Transacciones: r.tx,
      "Total MXN": r.total,
      NuevosRegistros: r.newC,
      Seguimientos: r.fups,
      Recomendaciones: r.recs,
      Visitas: r.visits,
      Adopción: r.adoption,
    }));
    downloadCSV(`desempeno_ba_${stamp()}`, rows);
    toast.success("Reporte exportado");
  };

  const exportAgenda = () => {
    const rows = appointments.map((a) => {
      const c = consumers.find((x) => x.id === a.consumerId) ??
        allConsumers.find((x) => x.id === a.consumerId);
      const ba = lookupBa(a.baId);
      return {
        Nombre: c?.firstName ?? "",
        Apellido: c?.lastName ?? "",
        Teléfono: c?.phone ?? "",
        Fecha: formatDateTime(a.date),
        Tipo: a.type,
        Estado: a.status,
        BA: ba?.name ?? "",
        Tienda: stores.find((s) => s.id === a.storeId)?.name ?? a.storeId,
        Comentarios: a.notes ?? "",
      };
    });
    downloadCSV(`agenda_${stamp()}`, rows);
    toast.success("Agenda exportada");
  };

  const exportAdoption = () => {
    const rows = visibleBas.map((b) => ({
      BA: b.name,
      Marca: b.brand === "ysl" ? "YSL" : "Lancôme",
      Tienda: stores.find((s) => s.id === b.storeId)?.name ?? b.storeId,
      Activo_hoy: baActiveToday.has(b.id) ? "Sí" : "No",
      Activo_en_rango: baActiveRange.has(b.id) ? "Sí" : "No",
      Transacciones: purchases.filter((p) => p.baId === b.id).length,
    }));
    downloadCSV(`adopcion_${stamp()}`, rows);
    toast.success("Adopción exportada");
  };

  const exportRetention = () => {
    const rows = consumerStatus.map(({ c, days, bucket }) => ({
      Nombre: c.firstName,
      Apellido: c.lastName,
      Teléfono: c.phone,
      Segmento: c.segment,
      Bucket: bucket,
      DíasSinCompra: days,
      Marca: c.brand === "ysl" ? "YSL" : "Lancôme",
    }));
    downloadCSV(`retencion_${stamp()}`, rows);
    toast.success("Retención exportada");
  };

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      <PageHeader
        eyebrow="Reportes y analítica"
        title="Dashboard Gerente"
        description="Reportes 100% dinámicos: filtros, KPIs vivos y exportación en cualquier tab."
      />

      <ReportFilters
        value={filters}
        onChange={setFilters}
        stores={stores}
        users={users}
        regions={regions}
        scope={scope}
      />

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "px-4 py-3 text-sm border-b-2 -mb-px transition whitespace-nowrap",
              tab === k
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <DashboardTab
          purchases={purchases}
          newConsumers={newConsumers}
          appointments={appointments}
          followUps={followUps}
          targetMx={targetMx}
          targetPct={targetPct}
          sellOut={sellOut}
          avgTicket={avgTicket}
          salesByBa={salesByBa}
          topStores={topStores}
          brandsMix={brandsMix}
          catMix={catMix}
          weeks={weeks}
          goalsConfigured={goals.data ? goals.data.goalsCount > 0 : false}
          onExport={() =>
            downloadCSV(`dashboard_${stamp()}`, [
              { KPI: "Sell-out", Valor: sellOut },
              { KPI: "Objetivo", Valor: targetMx },
              { KPI: "% Avance", Valor: targetPct },
              { KPI: "Transacciones", Valor: purchases.length },
              { KPI: "Ticket promedio", Valor: Math.round(avgTicket) },
              { KPI: "Nuevos registros", Valor: newConsumers.length },
              { KPI: "Seguimientos", Valor: followUps.length },
              { KPI: "Citas", Valor: appointments.length },
            ])
          }
        />
      )}

      {tab === "citas" && (
        <CitasTab
          appointments={appointments}
          stats={apptStats}
          consumers={consumers}
          allConsumers={allConsumers}
          stores={stores}
          lookupBa={lookupBa}
          appointmentsTarget={goals.data?.appointmentsTarget ?? 0}
          onExport={exportAgenda}
        />
      )}

      {tab === "conversion" && <ConversionTab data={conversion} />}

      {tab === "adopcion" && (
        <AdoptionTab
          visibleBas={visibleBas}
          baActiveToday={baActiveToday}
          baActiveRange={baActiveRange}
          adoptionToday={adoptionToday}
          adoptionRange={adoptionRange}
          weeks={weeks}
          stores={stores}
          storeIdToRegion={storeIdToRegion}
          purchases={purchases}
          onExport={exportAdoption}
        />
      )}

      {tab === "retencion" && (
        <RetentionTab
          retention={retention}
          retentionTotal={retentionTotal}
          reactivationList={reactivationList}
          onExport={exportRetention}
        />
      )}

      {tab === "consumidores" && (
        <ConsumersTab
          consumers={consumers}
          lookupBa={lookupBa}
          stores={stores}
          lastFuByConsumer={lastFuByConsumer}
          onExport={exportConsumers}
        />
      )}

      {tab === "ba" && (
        <BaTab baPerf={baPerf} stores={stores} onExport={exportBaPerf} />
      )}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

function fallbackTarget(filters: ReportFiltersValue, baCount: number) {
  // Estimación blanda cuando no hay metas configuradas: 250k MXN por BA por mes
  const days = Math.max(
    1,
    Math.ceil((filters.to.getTime() - filters.from.getTime()) / 86400000),
  );
  const monthly = 250000 * Math.max(1, baCount);
  return Math.round((monthly * days) / 30);
}

function computeApptStats(
  appts: Appointment[],
  allAppts: Appointment[],
  filters: ReportFiltersValue,
) {
  const rangeStart = filters.from.getTime();
  const total = appts.length;
  const created = allAppts.filter((a) => {
    // "nueva" = creada (scheduled) en el rango — usamos scheduled_at como proxy
    const t = new Date(a.date).getTime();
    return t >= rangeStart && t <= filters.to.getTime();
  }).length;
  return {
    total,
    nuevas: created,
    reagendadas: appts.filter((a) => a.status === "Reagendada").length,
    completadas: appts.filter((a) => a.status === "Completada").length,
    confirmadas: appts.filter((a) => a.status === "Confirmada").length,
    canceladas: appts.filter((a) => a.status === "Cancelada").length,
    noShow: appts.filter((a) => a.status === "NoShow").length,
  };
}

function buildWeeklySeries(
  consumers: Consumer[],
  purchases: Purchase[],
  basCount: number,
  filters: ReportFiltersValue,
) {
  const weeksCount = 8;
  const out = [];
  const end = new Date(filters.to);
  for (let i = weeksCount - 1; i >= 0; i--) {
    const wkEnd = new Date(end);
    wkEnd.setHours(23, 59, 59, 999);
    wkEnd.setDate(wkEnd.getDate() - i * 7);
    const wkStart = new Date(wkEnd);
    wkStart.setDate(wkStart.getDate() - 6);
    const consumersWeek = consumers.filter((c) => {
      const d = new Date(c.createdAt);
      return d >= wkStart && d <= wkEnd;
    });
    const purchasesWeek = purchases.filter((p) => {
      const d = new Date(p.date);
      return d >= wkStart && d <= wkEnd;
    });
    const baActive = new Set(purchasesWeek.map((p) => p.baId));
    out.push({
      semana: `S${weeksCount - i}`,
      nuevas: consumersWeek.length,
      recurrentes: purchasesWeek.length - consumersWeek.length,
      adopcion: basCount === 0 ? 0 : Math.round((baActive.size / basCount) * 100),
    });
  }
  return out;
}

function computeConversion(
  visits: { consumerId: string; visitedAt: string; baId: string; purchased?: boolean }[],
  followUps: FollowUp[],
  recommendations: { baId: string; consumerId: string; date: string; converted: boolean }[],
  purchases: Purchase[],
  visibleBaIds: Set<string>,
) {
  // Recomendación -> compra (usa flag converted en el seed; en real, fallback)
  const recsInScope = recommendations.filter((r) => visibleBaIds.has(r.baId));
  const recsTotal = recsInScope.length;
  const recsConverted = recsInScope.filter((r) => r.converted).length;

  // Seguimiento -> revisita: follow-ups con outcome "Convirtió" o "Necesita revisita"
  const fuTotal = followUps.length;
  const fuRevisita = followUps.filter(
    (f) => f.outcome === "Convirtió" || f.outcome === "Necesita revisita",
  ).length;

  // Visita -> compra
  const visitTotal = visits.length;
  const visitPurchased = visits.filter((v) => v.purchased).length;

  return {
    rec: {
      total: recsTotal,
      converted: recsConverted,
      rate: recsTotal > 0 ? Math.round((recsConverted / recsTotal) * 100) : 0,
    },
    fu: {
      total: fuTotal,
      revisita: fuRevisita,
      rate: fuTotal > 0 ? Math.round((fuRevisita / fuTotal) * 100) : 0,
    },
    visit: {
      total: visitTotal,
      purchased: visitPurchased,
      rate: visitTotal > 0 ? Math.round((visitPurchased / visitTotal) * 100) : 0,
    },
    funnel: [
      { stage: "Recomendaciones", value: recsTotal },
      { stage: "Visitas", value: visitTotal },
      { stage: "Compras", value: purchases.length },
      { stage: "Convertidas (reco)", value: recsConverted },
    ],
  };
}

// ============================================================
// Tab components
// ============================================================

function DashboardTab(props: {
  purchases: Purchase[];
  newConsumers: Consumer[];
  appointments: Appointment[];
  followUps: FollowUp[];
  targetMx: number;
  targetPct: number;
  sellOut: number;
  avgTicket: number;
  salesByBa: { name: string; ventas: number }[];
  topStores: { id: string; name: string; total: number }[];
  brandsMix: { name: string; value: number }[];
  catMix: { name: string; value: number }[];
  weeks: { semana: string; nuevas: number; recurrentes: number; adopcion: number }[];
  goalsConfigured: boolean;
  onExport: () => void;
}) {
  const { purchases, newConsumers, appointments, followUps, targetMx, targetPct, sellOut, avgTicket, salesByBa, topStores, brandsMix, catMix, weeks, goalsConfigured, onExport } = props;
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{purchases.length}</span> transacciones ·{" "}
          <span className="font-semibold text-foreground">{newConsumers.length}</span> nuevos registros ·{" "}
          <span className="font-semibold text-foreground">{appointments.length}</span> citas en el período.
        </p>
        <Button size="sm" variant="outline" onClick={onExport}>
          <Download className="size-3.5 mr-1.5" /> Exportar
        </Button>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Kpi label="Avance objetivo" value={`${targetPct}%`} sub={formatMoney(sellOut)} accent />
        <Kpi label="Sell-out" value={formatMoney(sellOut)} />
        <Kpi label="Transacciones" value={purchases.length} />
        <Kpi label="Ticket prom." value={formatMoney(avgTicket)} />
        <Kpi label="Nuevos registros" value={newConsumers.length} />
        <Kpi label="Seguimientos" value={followUps.length} />
      </section>

      <Card className="p-6 shadow-card">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">
            Objetivo del período {goalsConfigured ? "" : "(estimado — sin meta configurada)"}
          </span>
          <span className="font-display">
            {formatMoney(sellOut)} / {formatMoney(targetMx)}
          </span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div className="h-full gradient-brand transition-all duration-700" style={{ width: `${targetPct}%` }} />
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-6 shadow-card lg:col-span-2">
          <ChartHeader title="Ventas por BA" />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={salesByBa}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v) => formatMoney(Number(v))} />
              <Bar dataKey="ventas" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 shadow-card">
          <ChartHeader title="Mix por categoría" />
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={catMix} dataKey="value" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {catMix.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatMoney(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="mt-2 space-y-1.5">
            {catMix.map((c, i) => (
              <li key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: COLORS[i] }} />
                  {c.name}
                </span>
                <span className="font-medium">{formatMoney(c.value)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6 shadow-card">
          <ChartHeader title="Top tiendas por sell-out" icon={<StoreIcon className="size-4 text-primary" />} />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topStores} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
              <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} />
              <Tooltip formatter={(v) => formatMoney(Number(v))} />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 shadow-card">
          <ChartHeader title="Top marcas" />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={brandsMix}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => formatMoney(Number(v))} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {brandsMix.map((b, i) => (
                  <Cell key={b.name} fill={i === 0 ? "hsl(var(--primary))" : "hsl(var(--gold))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6 shadow-card">
        <ChartHeader title="Nuevas vs. recurrentes (8 semanas)" />
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={weeks}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="semana" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="nuevas" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="recurrentes" stroke="hsl(var(--gold))" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function CitasTab({
  appointments,
  stats,
  consumers,
  allConsumers,
  stores,
  lookupBa,
  appointmentsTarget,
  onExport,
}: {
  appointments: Appointment[];
  stats: ReturnType<typeof computeApptStats>;
  consumers: Consumer[];
  allConsumers: Consumer[];
  stores: Store[];
  lookupBa: (id?: string) => { id: string; name: string } | undefined;
  appointmentsTarget: number;
  onExport: () => void;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        <Button size="sm" onClick={onExport}>
          <Download className="size-4 mr-1.5" /> Exportar Agenda
        </Button>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-7 gap-3">
        <Kpi
          label="Objetivo sem."
          value={appointmentsTarget || "—"}
          sub={appointmentsTarget ? "Meta configurada" : "Sin meta"}
          accent
        />
        <Kpi label="Total citas" value={stats.total} />
        <Kpi label="Nuevas" value={stats.nuevas} />
        <Kpi label="Reagendadas" value={stats.reagendadas} />
        <Kpi label="Completadas" value={stats.completadas} />
        <Kpi label="Canceladas" value={stats.canceladas} />
        <Kpi label="No-show" value={stats.noShow} />
      </section>

      <Card className="overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Consumidor</th>
                <th className="text-left px-4 py-3 font-medium">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium">Fecha</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">Estado</th>
                <th className="text-left px-4 py-3 font-medium">BA</th>
                <th className="text-left px-4 py-3 font-medium">Tienda</th>
                <th className="text-left px-4 py-3 font-medium">Comentarios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Sin citas en el período / scope seleccionado.
                  </td>
                </tr>
              )}
              {appointments.map((a) => {
                const c =
                  consumers.find((x) => x.id === a.consumerId) ??
                  allConsumers.find((x) => x.id === a.consumerId);
                const ba = lookupBa(a.baId);
                return (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      {c ? (
                        <Link to={`/consumidores/${c.id}`} className="hover:underline font-medium">
                          {fullName(c.firstName, c.lastName)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c?.phone ?? ""}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(a.date)}</td>
                    <td className="px-4 py-3 text-xs">{a.type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full",
                          a.status === "Completada"
                            ? "bg-success/15 text-success"
                            : a.status === "Cancelada" || a.status === "NoShow"
                            ? "bg-destructive/15 text-destructive"
                            : a.status === "Reagendada"
                            ? "bg-gold/15 text-gold"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{ba?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {stores.find((s) => s.id === a.storeId)?.name ?? a.storeId}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[280px] truncate">
                      {a.notes ?? ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ConversionTab({ data }: { data: ReturnType<typeof computeConversion> }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-8 shadow-luxe gradient-brand text-primary-foreground">
        <p className="text-[11px] uppercase tracking-[0.3em] opacity-80 flex items-center gap-1.5">
          <PercentDiamond className="size-3.5" /> Tasas de conversión
        </p>
        <h2 className="font-display text-2xl mt-1">Embudo del clienteling</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <Hero label="Recomendación → compra" value={`${data.rec.rate}%`} sub={`${data.rec.converted} de ${data.rec.total}`} />
          <Hero label="Seguimiento → revisita" value={`${data.fu.rate}%`} sub={`${data.fu.revisita} de ${data.fu.total}`} />
          <Hero label="Visita → compra" value={`${data.visit.rate}%`} sub={`${data.visit.purchased} de ${data.visit.total}`} />
        </div>
      </Card>

      <Card className="p-6 shadow-card">
        <ChartHeader title="Embudo" />
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.funnel} layout="vertical" margin={{ left: 90 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis type="category" dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={12} width={140} />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function AdoptionTab({
  visibleBas,
  baActiveToday,
  baActiveRange,
  adoptionToday,
  adoptionRange,
  weeks,
  stores,
  storeIdToRegion,
  purchases,
  onExport,
}: {
  visibleBas: { id: string; name: string; brand: string; storeId: string }[];
  baActiveToday: Set<string>;
  baActiveRange: Set<string>;
  adoptionToday: number;
  adoptionRange: number;
  weeks: { semana: string; adopcion: number }[];
  stores: Store[];
  storeIdToRegion: Record<string, string>;
  purchases: Purchase[];
  onExport: () => void;
}) {
  const [view, setView] = useState<"ba" | "tienda" | "region">("ba");

  const byStore = useMemo(() => {
    const map = new Map<string, { active: number; total: number }>();
    visibleBas.forEach((b) => {
      const cur = map.get(b.storeId) ?? { active: 0, total: 0 };
      cur.total += 1;
      if (baActiveRange.has(b.id)) cur.active += 1;
      map.set(b.storeId, cur);
    });
    return Array.from(map.entries()).map(([id, v]) => ({
      id,
      name: stores.find((s) => s.id === id)?.name ?? id,
      ...v,
      pct: v.total ? Math.round((v.active / v.total) * 100) : 0,
    }));
  }, [visibleBas, baActiveRange, stores]);

  const byRegion = useMemo(() => {
    const map = new Map<string, { active: number; total: number }>();
    visibleBas.forEach((b) => {
      const r = storeIdToRegion[b.storeId] ?? "Otra";
      const cur = map.get(r) ?? { active: 0, total: 0 };
      cur.total += 1;
      if (baActiveRange.has(b.id)) cur.active += 1;
      map.set(r, cur);
    });
    return Array.from(map.entries()).map(([name, v]) => ({
      name,
      ...v,
      pct: v.total ? Math.round((v.active / v.total) * 100) : 0,
    }));
  }, [visibleBas, baActiveRange, storeIdToRegion]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex bg-muted rounded-lg p-0.5">
          {(["ba", "tienda", "region"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={cn(
                "px-3 py-1.5 text-xs uppercase tracking-widest rounded-md transition",
                view === k ? "bg-background shadow-sm font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {k === "ba" ? "Por BA" : k === "tienda" ? "Por Tienda" : "Por Región"}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={onExport}>
          <Download className="size-3.5 mr-1.5" /> Exportar
        </Button>
      </div>

      <Card className="p-8 shadow-luxe gradient-brand text-primary-foreground">
        <p className="text-[11px] uppercase tracking-[0.3em] opacity-80">Métrica héroe</p>
        <h2 className="font-display text-2xl mt-1">Tasa de adopción</h2>
        <div className="grid grid-cols-3 gap-6 mt-6">
          <Hero label="Hoy" value={`${adoptionToday}%`} />
          <Hero label="En el rango" value={`${adoptionRange}%`} />
          <Hero label="BAs activos" value={`${baActiveRange.size}/${visibleBas.length}`} />
        </div>
      </Card>

      <Card className="p-6 shadow-card">
        <ChartHeader title="Adopción últimas 8 semanas" />
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={weeks}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="semana" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Line type="monotone" dataKey="adopcion" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="overflow-hidden shadow-card">
        <div className="p-5 border-b border-border flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <h3 className="font-display text-lg">
            {view === "ba" ? "Estado por BA" : view === "tienda" ? "Adopción por Tienda" : "Adopción por Región"}
          </h3>
        </div>
        {view === "ba" && (
          <ul className="divide-y divide-border">
            {visibleBas.map((b) => {
              const active = baActiveRange.has(b.id);
              const tx = purchases.filter((p) => p.baId === b.id).length;
              return (
                <li key={b.id} className="flex items-center gap-3 p-4">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.brand === "ysl" ? "YSL Beauty" : "Lancôme"} · {tx} trans.
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full",
                      active ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                    )}
                  >
                    {active ? "Activa" : "Sin actividad"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {view === "tienda" && (
          <ul className="divide-y divide-border">
            {byStore.map((s) => (
              <li key={s.id} className="flex items-center gap-3 p-4">
                <div className="flex-1">
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.active} de {s.total} BAs activos</p>
                </div>
                <span className="font-display text-xl">{s.pct}%</span>
              </li>
            ))}
          </ul>
        )}
        {view === "region" && (
          <ul className="divide-y divide-border">
            {byRegion.map((r) => (
              <li key={r.name} className="flex items-center gap-3 p-4">
                <div className="flex-1">
                  <p className="font-medium text-sm">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.active} de {r.total} BAs activos</p>
                </div>
                <span className="font-display text-xl">{r.pct}%</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function RetentionTab({
  retention,
  retentionTotal,
  reactivationList,
  onExport,
}: {
  retention: { name: string; value: number }[];
  retentionTotal: number;
  reactivationList: { c: Consumer; days: number; bucket: string }[];
  onExport: () => void;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={onExport}>
          <Download className="size-3.5 mr-1.5" /> Exportar
        </Button>
      </div>
      <Card className="p-8 shadow-luxe gradient-brand text-primary-foreground">
        <p className="text-[11px] uppercase tracking-[0.3em] opacity-80 flex items-center gap-1.5">
          <HeartPulse className="size-3.5" /> Retención
        </p>
        <h2 className="font-display text-2xl mt-1">Salud de la cartera</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
          {retention.map((r) => (
            <Hero key={r.name} label={r.name} value={`${Math.round((r.value / retentionTotal) * 100)}%`} />
          ))}
        </div>
        <p className="text-[11px] opacity-70 mt-4">
          Activas ≤ 60d · Tibias 61–120d · En riesgo 121–180d · Perdidas {">"}180d
        </p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6 shadow-card">
          <ChartHeader title="Distribución de la cartera" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={retention}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {retention.map((r, i) => (
                  <Cell
                    key={i}
                    fill={
                      r.name === "Activas"
                        ? "hsl(var(--success))"
                        : r.name === "Tibias"
                        ? "hsl(var(--gold))"
                        : r.name === "En riesgo"
                        ? "hsl(var(--warning))"
                        : "hsl(var(--destructive))"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="overflow-hidden shadow-card">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <h3 className="font-display text-lg">Top candidatas a reactivación</h3>
          </div>
          {reactivationList.length === 0 ? (
            <p className="p-8 text-sm text-center text-muted-foreground">
              Cartera al día — sin clientas en riesgo.
            </p>
          ) : (
            <ul className="divide-y divide-border max-h-[320px] overflow-y-auto">
              {reactivationList.map(({ c, days, bucket }) => (
                <li key={c.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <Link to={`/consumidores/${c.id}`} className="text-sm font-medium hover:underline">
                      {fullName(c.firstName, c.lastName)}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">
                      Última compra hace {days}d · {c.brand === "ysl" ? "YSL" : "Lancôme"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full",
                      bucket === "Tibias" ? "bg-gold/15 text-gold" : "bg-warning/15 text-warning",
                    )}
                  >
                    {bucket}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function ConsumersTab({
  consumers,
  lookupBa,
  stores,
  lastFuByConsumer,
  onExport,
}: {
  consumers: Consumer[];
  lookupBa: (id?: string) => { id: string; name: string } | undefined;
  stores: Store[];
  lastFuByConsumer: Map<string, FollowUp>;
  onExport: () => void;
}) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">{consumers.length} consumidores en el scope/filtros.</p>
        <Button onClick={onExport}>
          <Download className="size-4 mr-1.5" /> Exportar Excel/CSV
        </Button>
      </div>
      <Card className="overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Consumidor</th>
                <th className="text-left px-4 py-3 font-medium">Segmento</th>
                <th className="text-left px-4 py-3 font-medium">Marca</th>
                <th className="text-left px-4 py-3 font-medium">Tienda</th>
                <th className="text-left px-4 py-3 font-medium">BA</th>
                <th className="text-left px-4 py-3 font-medium">Clienta desde</th>
                <th className="text-left px-4 py-3 font-medium">Último contacto</th>
                <th className="text-left px-4 py-3 font-medium">Última compra</th>
                <th className="text-left px-4 py-3 font-medium">Tipo seguimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {consumers.map((c) => {
                const ba = lookupBa(c.assignedBaId);
                const lastFu = lastFuByConsumer.get(c.id);
                return (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link to={`/consumidores/${c.id}`} className="hover:underline font-medium">
                        {fullName(c.firstName, c.lastName)}
                      </Link>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <SegmentBadge segment={c.segment} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-xs uppercase tracking-widest">
                      {c.brand === "ysl" ? "YSL" : "Lancôme"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {stores.find((s) => s.id === c.storeId)?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{ba?.name.split(" ")[0] ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(c.lastContactAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(c.lastTransactionAt)}</td>
                    <td className="px-4 py-3 text-xs">
                      {lastFu ? (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{lastFu.type}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function BaTab({
  baPerf,
  stores,
  onExport,
}: {
  baPerf: {
    ba: { id: string; name: string; brand: string; storeId: string };
    tx: number;
    total: number;
    newC: number;
    fups: number;
    recs: number;
    visits: number;
    adoption: string;
  }[];
  stores: Store[];
  onExport: () => void;
}) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <Button onClick={onExport}>
          <Download className="size-4 mr-1.5" /> Exportar
        </Button>
      </div>
      <Card className="overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 font-medium">BA</th>
                <th className="text-left px-4 py-3 font-medium">Tienda</th>
                <th className="text-right px-4 py-3 font-medium">Trans.</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-right px-4 py-3 font-medium">Nuevos</th>
                <th className="text-right px-4 py-3 font-medium">Seg.</th>
                <th className="text-right px-4 py-3 font-medium">Visitas</th>
                <th className="text-right px-4 py-3 font-medium">Reco.</th>
                <th className="text-left px-4 py-3 font-medium">Adopción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {baPerf.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Sin BAs en el scope/filtros seleccionados.
                  </td>
                </tr>
              )}
              {baPerf.map((r) => (
                <tr key={r.ba.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.ba.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.ba.brand === "ysl" ? "YSL" : "Lancôme"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {stores.find((s) => s.id === r.ba.storeId)?.name ?? r.ba.storeId}
                  </td>
                  <td className="px-4 py-3 text-right">{r.tx}</td>
                  <td className="px-4 py-3 text-right font-display">{formatMoney(r.total)}</td>
                  <td className="px-4 py-3 text-right">{r.newC}</td>
                  <td className="px-4 py-3 text-right">{r.fups}</td>
                  <td className="px-4 py-3 text-right">{r.visits}</td>
                  <td className="px-4 py-3 text-right">{r.recs}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        r.adoption === "Alta"
                          ? "bg-success/15 text-success"
                          : r.adoption === "Media"
                          ? "bg-gold/15 text-gold"
                          : "bg-destructive/15 text-destructive",
                      )}
                    >
                      {r.adoption}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className={cn("p-4 shadow-card", accent && "bg-gradient-brand text-primary-foreground")}>
      <p className={cn("text-[10px] uppercase tracking-[0.25em]", accent ? "opacity-80" : "text-muted-foreground")}>
        {label}
      </p>
      <p className="font-display text-2xl mt-1 leading-none">{value}</p>
      {sub && <p className={cn("text-[11px] mt-1.5", accent ? "opacity-80" : "text-muted-foreground")}>{sub}</p>}
    </Card>
  );
}

function Hero({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest opacity-80">{label}</p>
      <p className="font-display text-5xl mt-1 leading-none">{value}</p>
      {sub && <p className="text-[11px] opacity-70 mt-2">{sub}</p>}
    </div>
  );
}

function ChartHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon}
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Gráfica</p>
        <h3 className="font-display text-lg">{title}</h3>
      </div>
    </div>
  );
}

// suprime warning: CalendarDays se referencia desde icons unused
void CalendarDays;
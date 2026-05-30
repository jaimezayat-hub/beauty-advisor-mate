import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarDays,
  ChevronDown,
  Download,
  DollarSign,
  FileText,
  RefreshCw,
  Smartphone,
  Target,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/clienteling/PageHeader";
import { useApp, useCurrentUser } from "@/store/useApp";
import { formatMoney } from "@/lib/format";
import { downloadCSV } from "@/lib/csv";
import { cn } from "@/lib/utils";
import type { Appointment, BaKpiProfile, Consumer, FollowUp, Purchase, Recommendation, Sample, User } from "@/lib/types";
import { getScope } from "@/lib/permissions";
import { usePerformanceKpis, useTopProducts, type KpiPeriod, type KpiSummary, type TopProductRow } from "@/lib/db/usePerformance";
import {
  ReportFilters,
  defaultFilters,
  type ReportFiltersValue,
} from "@/components/clienteling/ReportFilters";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--gold))"];
const SOFT_GRID = "hsl(var(--border))";

type KpiFocus = "ventas" | "clienteling" | "adopcion";
type Category = "all" | "Skincare" | "Makeup" | "Fragancia";

function presetToPeriod(preset: ReportFiltersValue["preset"]): KpiPeriod {
  if (preset === "hoy" || preset === "7d") return "semana";
  if (preset === "trimestre" || preset === "ano") return "trimestre";
  return "mes";
}

function periodLabelFromFilters(f: ReportFiltersValue): string {
  const map: Record<ReportFiltersValue["preset"], string> = {
    hoy: "Hoy",
    "7d": "Últimos 7 días",
    mes: "Este mes",
    trimestre: "Últimos 3 meses",
    ano: "Este año",
    custom: `${f.from.toLocaleDateString("es-MX")} – ${f.to.toLocaleDateString("es-MX")}`,
  };
  return map[f.preset];
}

function buildLocalProfiles(args: { users: User[]; purchases: Purchase[]; consumers: Consumer[]; recommendations: Recommendation[]; appointments: Appointment[]; followUps: FollowUp[]; samples: Sample[]; filters: ReportFiltersValue }): BaKpiProfile[] {
  const { users, purchases, consumers, recommendations, appointments, followUps, samples, filters } = args;
  const from = filters.from.getTime();
  const to = filters.to.getTime();
  const rangeMs = Math.max(86400000, to - from);
  const previousFrom = from - rangeMs;
  const baUsers = users.filter((u) => u.role === "ba");
  const amountForCategory = (p: Purchase) => p.lines.reduce((sum, l) => {
    const cat = l.category ?? categoryFromSku(l.sku);
    return filters.category === "all" || cat === filters.category ? sum + l.qty * l.price : sum;
  }, 0);
  const inCurrent = (isoDate: string) => {
    const t = new Date(isoDate).getTime();
    return t >= from && t <= to;
  };
  const inPrevious = (isoDate: string) => {
    const t = new Date(isoDate).getTime();
    return t >= previousFrom && t < from;
  };
  const rangeDays = Math.max(1, Math.ceil(rangeMs / 86400000));
  const workDays = countWeekdays(filters.from, filters.to);
  const profiles = baUsers.map((ba) => {
    const currentPurchases = purchases.filter((p) => p.baId === ba.id && inCurrent(p.date) && amountForCategory(p) > 0);
    const previousPurchases = purchases.filter((p) => p.baId === ba.id && inPrevious(p.date) && amountForCategory(p) > 0);
    const currentConsumers = consumers.filter((c) => c.assignedBaId === ba.id && inCurrent(c.createdAt));
    const currentRecs = recommendations.filter((r) => r.baId === ba.id && inCurrent(r.date) && (filters.category === "all" || r.products.some((p) => categoryFromSku(p.sku) === filters.category)));
    const currentFups = followUps.filter((f) => f.baId === ba.id && inCurrent(f.date));
    const currentAppts = appointments.filter((a) => a.baId === ba.id && inCurrent(a.date));
    const currentSamples = samples.filter((s) => s.baId === ba.id && inCurrent(s.date));
    const periodSales = currentPurchases.reduce((s, p) => s + amountForCategory(p), 0);
    const activeDates = new Set<string>();
    currentPurchases.forEach((p) => activeDates.add(p.date.slice(0, 10)));
    currentConsumers.forEach((c) => activeDates.add(c.createdAt.slice(0, 10)));
    currentRecs.forEach((r) => activeDates.add(r.date.slice(0, 10)));
    currentFups.forEach((f) => activeDates.add(f.date.slice(0, 10)));
    currentAppts.forEach((a) => activeDates.add(a.date.slice(0, 10)));
    const history = buildLocalHistory(ba.id, purchases, consumers, recommendations, filters, amountForCategory);
    return {
      baId: ba.id,
      baName: ba.name,
      storeId: ba.storeId,
      brand: ba.brand,
      periodSales,
      previousSales: previousPurchases.reduce((s, p) => s + amountForCategory(p), 0),
      transactions: currentPurchases.length,
      periodNewConsumers: currentConsumers.length,
      recommendationsTotal: currentRecs.length,
      convertedRecommendationsTotal: currentRecs.filter((r) => r.converted).length,
      monthlyTarget: Math.max(1, Math.round((250000 * rangeDays) / 30)),
      newConsumerTarget: Math.max(1, Math.round((16 * rangeDays) / 30)),
      activeDays: activeDates.size,
      workDays,
      followUpsCompleted: currentFups.filter((f) => f.status === "completado" || f.outcome === "Convirtió").length,
      followUpsPending: currentFups.filter((f) => f.status !== "completado" && f.outcome !== "Convirtió").length,
      birthdaysContacted: currentFups.filter((f) => f.type === "Cumpleaños" && f.status === "completado").length,
      birthdaysTotal: currentFups.filter((f) => f.type === "Cumpleaños").length,
      replenishmentsActivated: currentSamples.filter((s) => s.converted).length,
      appointmentsScheduled: currentAppts.length,
      appointmentsCompleted: currentAppts.filter((a) => a.status === "Completada").length,
      appointmentsCancelled: currentAppts.filter((a) => a.status === "Cancelada").length,
      adoptionScore: Math.min(100, Math.round((activeDates.size / Math.max(1, workDays)) * 70 + (currentFups.length ? 15 : 0) + (currentConsumers.length ? 15 : 0))),
      rank: 1,
      rankTotal: baUsers.length,
      categorySales: categorySalesFromPurchases(currentPurchases),
      history,
    };
  });
  const ranked = profiles.sort((a, b) => (b.periodSales ?? 0) - (a.periodSales ?? 0));
  return ranked.map((p, i) => ({ ...p, rank: i + 1, rankTotal: ranked.length }));
}

export default function Performance() {
  const user = useCurrentUser()!;
  const { users, stores, consumers, purchases, recommendations, appointments, followUps, samples, isRealSession } = useApp();
  const [filters, setFilters] = useState<ReportFiltersValue>(() => defaultFilters());
  const category = filters.category as Category;
  const period = presetToPeriod(filters.preset);
  const { data: liveKpis } = usePerformanceKpis(isRealSession, period, {
    from: filters.from.toISOString(),
    to: filters.to.toISOString(),
    brand: filters.brand,
    baId: filters.baId,
    storeId: filters.storeId,
    category,
  });
  const { data: liveTopProducts } = useTopProducts(isRealSession, period, {
    from: filters.from.toISOString(),
    to: filters.to.toISOString(),
    brand: filters.brand,
    baId: filters.baId,
    storeId: filters.storeId,
    category,
  }, 8);
  const periodLabel = periodLabelFromFilters(filters);
  const isBa = user.role === "ba";
  const isDirector = user.role === "zone_supervisor" || user.role === "central_admin";
  const scope = getScope(user);
  const storeIdToRegion = Object.fromEntries(stores.map((s) => [s.id, s.region]));
  const regions = Array.from(new Set(stores.map((s) => s.region)));
  const seedProfiles = useMemo(
    () => buildLocalProfiles({ users, purchases, consumers, recommendations, appointments, followUps, samples, filters }),
    [users, purchases, consumers, recommendations, appointments, followUps, samples, filters],
  );
  const sourceProfiles = isRealSession ? liveKpis?.profiles ?? [] : seedProfiles;
  const topProducts = isRealSession ? liveTopProducts ?? [] : buildLocalTopProducts(purchases, filters, 8);
  const baseProfiles = sourceProfiles.filter((k) => {
    const u = users.find((x) => x.id === k.baId);
    const storeId = u?.storeId ?? k.storeId ?? "";
    switch (scope.kind) {
      case "self": return k.baId === scope.userId;
      case "store": return storeId === scope.storeId;
      case "region": return storeIdToRegion[storeId] === scope.region || user.region === scope.region;
      case "all": return true;
    }
  });
  const profiles = baseProfiles.filter((k) => {
    const u = users.find((x) => x.id === k.baId);
    const storeId = u?.storeId ?? k.storeId ?? "";
    const brand = u?.brand ?? k.brand;
    if (filters.baId !== "all" && k.baId !== filters.baId) return false;
    if (filters.storeId !== "all" && storeId !== filters.storeId) return false;
    if (filters.region !== "all" && storeIdToRegion[storeId] !== filters.region) return false;
    if (filters.brand !== "all" && brand !== filters.brand) return false;
    if (filters.chain !== "all") {
      const st = stores.find((s) => s.id === storeId);
      if (st?.chain !== filters.chain) return false;
    }
    return true;
  });
  const current =
    (filters.baId !== "all" && profiles.find((k) => k.baId === filters.baId)) ||
    profiles.find((k) => k.baId === user.id) ||
    profiles[0];

  // RF-31 — métricas reales de reagendadas/canceladas a partir de citas
  const baIds = new Set(profiles.map((p) => p.baId));
  const fromTs = filters.from.getTime();
  const toTs = filters.to.getTime();
  const visibleAppts = appointments.filter((a) => {
    if (!baIds.has(a.baId)) return false;
    const t = new Date(a.date).getTime();
    return t >= fromTs && t <= toTs;
  });
  const seedStats = {
    total: visibleAppts.length,
    rescheduled: visibleAppts.filter((a) => a.status === "Reagendada").length,
    cancelled: visibleAppts.filter((a) => a.status === "Cancelada").length,
    noShow: visibleAppts.filter((a) => a.status === "NoShow").length,
  };
  const apptStats = liveKpis
    ? {
        total: liveKpis.apptTotal,
        rescheduled: 0,
        cancelled: liveKpis.apptCancelled,
        noShow: liveKpis.apptNoShow,
      }
    : seedStats;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Performance clienteling"
        title={isBa ? "Mi Desempeño" : "Desempeño del Equipo"}
        description="KPIs de ventas, clienteling y adopción con lectura ejecutiva e interacción por período."
      />

      <ReportFilters
        value={filters}
        onChange={setFilters}
        stores={stores}
        users={users}
        regions={regions}
        scope={scope}
      />

      <p className="text-xs text-muted-foreground">{periodLabel}</p>

      {/* Mi desempeño personal (visible para todos los roles) */}
      {current && (
        <BaPanel
          profile={current}
          user={users.find((u) => u.id === current.baId) ?? user}
          period={periodLabel}
          apptStats={apptStats}
          liveKpis={liveKpis}
          category={category}
          topProducts={topProducts ?? []}
        />
      )}
      {/* Desempeño del equipo en scope (oculto para BAs) */}
      {!isBa && <TeamPanel profiles={profiles} users={users} />}
      {isDirector && <SuccessMetrics profiles={profiles} />}
      {!isBa && <ApptHealthCard stats={apptStats} />}
    </div>
  );
}

function BaPanel({ profile, user, period, apptStats, category, topProducts }: { profile: BaKpiProfile; user: User; period: string; apptStats: { total: number; rescheduled: number; cancelled: number; noShow: number }; liveKpis?: KpiSummary; category: Category; topProducts: import("@/lib/db/usePerformance").TopProductRow[] }) {
  const [focus, setFocus] = useState<KpiFocus>("ventas");
  const categoryTotal = Object.values(profile.categorySales).reduce((s, v) => s + v, 0) || 1;
  const categoryShare =
    category === "all" ? 1 : (profile.categorySales[category] ?? 0) / categoryTotal;
  const scale = (n: number) => Math.round(n * categoryShare);
  const seedMonthSales = scale(profile.history.slice(-4).reduce((s, w) => s + w.sales, 0));
  const previousSales = profile.previousSales ?? scale(profile.history.slice(0, 4).reduce((s, w) => s + w.sales, 0));
  const monthSales = profile.periodSales ?? seedMonthSales;
  const transactions = profile.transactions ?? scale(Math.round(seedMonthSales / 3450));
  const averageTicket = transactions > 0 ? monthSales / transactions : 0;
  const recs = profile.recommendationsTotal ?? profile.history.slice(-4).reduce((s, w) => s + w.recommendations, 0);
  const converted = profile.convertedRecommendationsTotal ?? profile.history.slice(-4).reduce((s, w) => s + w.convertedRecommendations, 0);
  const newConsumers = profile.periodNewConsumers ?? profile.history.slice(-4).reduce((s, w) => s + w.newConsumers, 0);
  const targetPct = Math.round((monthSales / profile.monthlyTarget) * 100);
  const growth = previousSales > 0 ? Math.round(((monthSales - previousSales) / previousSales) * 100) : 0;
  const fupsCompleted = profile.followUpsCompleted;
  const fupsPending = profile.followUpsPending;

  const salesSpark = profile.history.map((w) => Math.max(1, w.sales));
  const newSpark = profile.history.map((w) => Math.max(1, w.newConsumers));
  const safeRecRate = recs > 0 ? Math.round((converted / recs) * 100) : 0;
  const cards: KpiCardProps[] = [
    { focus: "ventas", icon: <DollarSign />, label: "Total vendido", value: formatMoney(monthSales), hint: `Objetivo ${formatMoney(profile.monthlyTarget)}`, progress: targetPct, delta: `${growth >= 0 ? "+" : ""}${growth}% vs período previo`, spark: salesSpark },
    { focus: "ventas", icon: <FileText />, label: "Transacciones", value: transactions.toString(), hint: "Compras registradas", spark: salesSpark },
    { focus: "ventas", icon: <TrendingUp />, label: "Ticket promedio", value: formatMoney(averageTicket), hint: "Por transacción", spark: salesSpark.map((s, i) => Math.round(s / Math.max(1, profile.history[i]?.newConsumers || 1))) },
    { focus: "ventas", icon: <RefreshCw />, label: "Conversión reco. → venta", value: recs > 0 ? `${safeRecRate}%` : "—", hint: recs > 0 ? `${converted} de ${recs}` : "Sin recomendaciones registradas", progress: safeRecRate },
    { focus: "clienteling", icon: <UserPlus />, label: "Nuevas consumidoras", value: `${newConsumers}/${profile.newConsumerTarget}`, hint: "Registros vs objetivo", progress: (newConsumers / profile.newConsumerTarget) * 100, spark: newSpark },
    { focus: "clienteling", icon: <FileText />, label: "Seguimientos", value: `${fupsCompleted}/${fupsCompleted + fupsPending}`, hint: "Completados vs pendientes", donut: [fupsCompleted, Math.max(0, fupsPending)] },
    { focus: "clienteling", icon: <CalendarDays />, label: "Cumpleaños atendidos", value: profile.birthdaysTotal ? `${profile.birthdaysContacted}/${profile.birthdaysTotal}` : "—", hint: profile.birthdaysTotal ? "Alertas del período" : "Sin cumpleaños en período", progress: profile.birthdaysTotal ? (profile.birthdaysContacted / profile.birthdaysTotal) * 100 : 0 },
    { focus: "clienteling", icon: <RefreshCw />, label: "Reposiciones activadas", value: profile.replenishmentsActivated.toString(), hint: "Muestras → compra", spark: newSpark },
    { focus: "adopcion", icon: <Smartphone />, label: "Días activa", value: `${profile.activeDays}/${profile.workDays}`, hint: "Días laborales del período", progress: (profile.activeDays / profile.workDays) * 100, spark: salesSpark },
    { focus: "adopcion", icon: <Trophy />, label: "Adopción", value: `${profile.adoptionScore}/100`, hint: "Actividad ponderada", progress: profile.adoptionScore, spark: salesSpark },
    { focus: "adopcion", icon: <CalendarDays />, label: "Citas", value: `${profile.appointmentsScheduled}/${profile.appointmentsCompleted}/${profile.appointmentsCancelled}`, hint: "Agendadas / completadas / canceladas" },
    { focus: "adopcion", icon: <RefreshCw />, label: "Reagendadas / NoShow", value: `${apptStats.rescheduled} / ${apptStats.noShow}`, hint: "Citas reagendadas o sin asistencia" },
    { focus: "adopcion", icon: <Users />, label: "Ranking tienda", value: `#${profile.rank} de ${profile.rankTotal}`, hint: `Puesto #${profile.rank} de ${profile.rankTotal} BAs` },
  ];

  return (
    <div className="space-y-6">
      <ExecutiveHero profile={profile} user={user} monthSales={monthSales} targetPct={targetPct} period={period} />

      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            downloadCSV(`mi-desempeno-${user.name.split(" ")[0]}.csv`, [
              { metrica: "Período", valor: period },
              { metrica: "Categoría", valor: category },
              { metrica: "Ventas", valor: monthSales },
              { metrica: "Objetivo", valor: profile.monthlyTarget },
              { metrica: "Avance %", valor: targetPct },
              { metrica: "Transacciones", valor: transactions },
              { metrica: "Ticket promedio", valor: Math.round(averageTicket) },
              { metrica: "Nuevas consumidoras", valor: newConsumers },
              { metrica: "Objetivo registros", valor: profile.newConsumerTarget },
              { metrica: "Seguimientos completados", valor: fupsCompleted },
              { metrica: "Seguimientos pendientes", valor: fupsPending },
              { metrica: "Citas agendadas", valor: profile.appointmentsScheduled },
              { metrica: "Citas completadas", valor: profile.appointmentsCompleted },
              { metrica: "Citas canceladas", valor: profile.appointmentsCancelled },
              { metrica: "Citas reagendadas", valor: apptStats.rescheduled },
              { metrica: "No-show", valor: apptStats.noShow },
              { metrica: "Días activa", valor: profile.activeDays },
              { metrica: "Días laborales", valor: profile.workDays },
              { metrica: "Adopción", valor: profile.adoptionScore },
              { metrica: "Ranking", valor: `#${profile.rank} de ${profile.rankTotal}` },
              { metrica: "Ventas Skincare", valor: profile.categorySales.Skincare },
              { metrica: "Ventas Makeup", valor: profile.categorySales.Makeup },
              { metrica: "Ventas Fragancia", valor: profile.categorySales.Fragancia },
            ]);
          }}
        >
          <Download className="size-4 mr-1" /> Exportar Mi Desempeño
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl">Centro de KPIs</h2>
            <div className="flex rounded-md border border-border bg-card p-1">
              {(["ventas", "clienteling", "adopcion"] as KpiFocus[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFocus(f)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors",
                    focus === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {cards.map((c) => <KpiCard key={c.label} {...c} active={c.focus === focus} onClick={() => setFocus(c.focus)} />)}
          </div>
        </section>
        <ActionPanel profile={profile} focus={focus} />
      </div>

      <Charts profile={profile} focus={focus} setFocus={setFocus} topProducts={topProducts} />
    </div>
  );
}

function ExecutiveHero({ profile, user, monthSales, targetPct, period }: { profile: BaKpiProfile; user: User; monthSales: number; targetPct: number; period: string }) {
  const gaugeData = [{ name: "avance", value: Math.min(targetPct, 125), fill: "hsl(var(--primary))" }];
  return (
    <Card className="overflow-hidden border-primary/20">
      <div className="grid lg:grid-cols-[1.2fr_360px]">
        <div className="p-6 lg:p-7 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">{period}</span>
            <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">{statusLabel(monthSales / profile.monthlyTarget)}</span>
          </div>
          <div>
            <p className="kpi-label">Lectura ejecutiva</p>
            <h2 className="font-display text-3xl lg:text-4xl text-primary mt-2">
              {user.name.split(" ")[0]} va al {targetPct}% de su objetivo mensual.
            </h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
              Venta acumulada de {formatMoney(monthSales)} con mayor peso en skincare y oportunidad inmediata en seguimientos pendientes.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <MiniStat label="Objetivo" value={formatMoney(profile.monthlyTarget)} />
            <MiniStat label="Brecha" value={formatMoney(Math.max(profile.monthlyTarget - monthSales, 0))} />
            <MiniStat label="Adopción" value={`${profile.adoptionScore}/100`} />
          </div>
        </div>
        <div className="border-t lg:border-t-0 lg:border-l border-border p-5 bg-muted/20">
          <p className="kpi-label mb-2">Avance a objetivo</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="68%" outerRadius="100%" data={gaugeData} startAngle={210} endAngle={-30}>
                <RadialBar dataKey="value" cornerRadius={12} background={{ fill: "hsl(var(--muted))" }} />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-primary font-display text-4xl font-light">{targetPct}%</text>
                <text x="50%" y="64%" textAnchor="middle" className="fill-muted-foreground text-xs uppercase tracking-widest">Meta mensual</text>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="kpi-label">{label}</p><p className="font-display text-2xl font-light mt-1">{value}</p></div>;
}

function ApptHealthCard({ stats }: { stats: { total: number; rescheduled: number; cancelled: number; noShow: number } }) {
  const completed = Math.max(stats.total - stats.cancelled - stats.noShow - stats.rescheduled, 0);
  const data = [
    { label: "Completadas", value: completed, color: "hsl(var(--success))" },
    { label: "Reagendadas", value: stats.rescheduled, color: "hsl(var(--gold))" },
    { label: "Canceladas", value: stats.cancelled, color: "hsl(var(--accent))" },
    { label: "NoShow", value: stats.noShow, color: "hsl(var(--destructive))" },
  ];
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="kpi-label">Salud de citas (RF-31)</p>
          <h3 className="font-display text-xl mt-1">{stats.total} citas en alcance</h3>
        </div>
        <CalendarDays className="size-5 text-primary" />
      </div>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-sm">
            <span className="text-muted-foreground">{d.label}</span>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: d.color }} />
            </div>
            <span className="font-display tabular-nums w-8 text-right">{d.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

type KpiCardProps = { focus: KpiFocus; icon: React.ReactNode; label: string; value: string; hint: string; progress?: number; donut?: number[]; delta?: string; spark?: number[]; active?: boolean; onClick?: () => void };
function KpiCard({ icon, label, value, hint, progress, donut, delta, spark, active, onClick }: KpiCardProps) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card className={cn("p-5 h-full transition-colors duration-150", active ? "border-primary bg-primary/5" : "hover:border-primary/40")}>
        <div className="flex items-start justify-between gap-3">
          <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center [&_svg]:size-5">{icon}</div>
          {donut ? <MiniDonut done={donut[0]} pending={donut[1]} /> : <Sparkline values={spark && spark.length ? spark : [0, 0, 0, 0, 0, 0, 0]} />}
        </div>
        <p className="kpi-label mt-4">{label}</p>
        <p className="kpi-number mt-2 !text-3xl break-all">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        {delta && <p className="text-xs text-success mt-2">{delta}</p>}
        {progress !== undefined && <Progress value={Math.min(progress, 100)} className="h-2 mt-4" />}
      </Card>
    </button>
  );
}

function ActionPanel({ profile, focus }: { profile: BaKpiProfile; focus: KpiFocus }) {
  const content = {
    ventas: ["Impulsar fragancias premium en tickets con skincare.", "Cerrar brecha con 3 tickets de alto valor.", "Priorizar consumidores VIP con compra >60 días."],
    clienteling: ["Completar seguimientos pendientes antes de las 17:00.", "Activar reposición en clientas de 30–90 días.", "Contactar cumpleaños restantes del mes."],
    adopcion: ["Registrar cada interacción del counter en el momento.", "Convertir citas completadas en recomendaciones guardadas.", "Mantener actividad diaria para sostener adopción >90."],
  }[focus];
  return (
    <Card className="p-5 h-fit sticky top-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="kpi-label">Siguiente mejor acción</p>
          <h3 className="font-display text-xl mt-1">Prioridades</h3>
        </div>
        <Zap className="size-5 text-primary" />
      </div>
      <ul className="space-y-3">
        {content.map((item, i) => (
          <li key={item} className="flex gap-3 rounded-xl border border-border bg-muted/20 p-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-xs">{i + 1}</span>
            <span className="text-sm text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-xl bg-primary/10 p-3 text-sm text-primary">
        Score compuesto: <b>{profile.adoptionScore}</b> · ranking tienda #{profile.rank}
      </div>
    </Card>
  );
}

function Charts({ profile, focus, setFocus, topProducts }: { profile: BaKpiProfile; focus: KpiFocus; setFocus: (f: KpiFocus) => void; topProducts: import("@/lib/db/usePerformance").TopProductRow[] }) {
  const [categoryKey, setCategoryKey] = useState("Skincare");
  const category = Object.entries(profile.categorySales).map(([name, value]) => ({ name, value }));
  const conversionData = profile.history.map((w) => ({ ...w, conversion: Math.round((w.convertedRecommendations / w.recommendations) * 100) }));
  const radar = [
    { metric: "Ventas", value: Math.min(100, Math.round(profile.history.slice(-4).reduce((s, w) => s + w.sales, 0) / profile.monthlyTarget * 100)) },
    { metric: "Registros", value: Math.min(100, Math.round(profile.history.slice(-4).reduce((s, w) => s + w.newConsumers, 0) / profile.newConsumerTarget * 100)) },
    { metric: "Seguimientos", value: Math.round(profile.followUpsCompleted / (profile.followUpsCompleted + profile.followUpsPending) * 100) },
    { metric: "Citas", value: Math.round(profile.appointmentsCompleted / profile.appointmentsScheduled * 100) },
    { metric: "Adopción", value: profile.adoptionScore },
  ];
  const activity = Array.from({ length: 21 }, (_, i) => ({ day: i + 1, level: [1, 3, 2, 4, 3, 0, 0, 2, 4, 3, 4, 2, 0, 1, 3, 4, 4, 2, 1, 3, 4][i] }));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl">Análisis interactivo</h2>
        <div className="flex gap-2">
          <Button variant={focus === "ventas" ? "default" : "outline"} size="sm" onClick={() => setFocus("ventas")}>Ventas</Button>
          <Button variant={focus === "clienteling" ? "default" : "outline"} size="sm" onClick={() => setFocus("clienteling")}>Clienteling</Button>
          <Button variant={focus === "adopcion" ? "default" : "outline"} size="sm" onClick={() => setFocus("adopcion")}>Adopción</Button>
        </div>
      </div>
      <div className="grid xl:grid-cols-[1.4fr_0.9fr] gap-4">
        <ChartCard title="Ventas por semana vs objetivo" action="Hover para detalle">
          <ComposedChart data={profile.history}>
            <defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.32} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={SOFT_GRID} />
            <XAxis dataKey="week" />
            <YAxis tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} />
            <Tooltip content={<RichTooltip money />} />
            <Area type="monotone" dataKey="sales" fill="url(#salesFill)" stroke="hsl(var(--primary))" strokeWidth={2} />
            <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} barSize={28} />
            <Line type="monotone" dataKey="salesTarget" stroke="hsl(var(--gold))" strokeWidth={3} dot={false} />
            <ReferenceLine y={profile.history.at(-1)?.salesTarget} stroke="hsl(var(--gold))" strokeDasharray="4 4" />
            <Legend />
          </ComposedChart>
        </ChartCard>
        <ChartCard title="Salud del desempeño" action="Índice 0–100">
          <RadarChart data={radar}>
            <PolarGrid stroke={SOFT_GRID} />
            <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.22} strokeWidth={2} />
            <Tooltip />
          </RadarChart>
        </ChartCard>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <ChartCard title="Nuevos registros" action="Tendencia 8 semanas">
          <AreaChart data={profile.history}>
            <defs><linearGradient id="newFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.55} /><stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.05} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={SOFT_GRID} />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Area dataKey="newConsumers" type="monotone" stroke="hsl(var(--primary))" fill="url(#newFill)" strokeWidth={3} />
          </AreaChart>
        </ChartCard>
        <ChartCard title="Mix de venta por categoría" action={categoryKey}>
          <PieChart>
            <Pie data={category} dataKey="value" innerRadius={56} outerRadius={92} paddingAngle={4} onClick={(d) => setCategoryKey(String(d.name))}>
              {category.map((entry, i) => <Cell key={entry.name} fill={COLORS[i]} stroke={entry.name === categoryKey ? "hsl(var(--foreground))" : "transparent"} strokeWidth={2} />)}
            </Pie>
            <Tooltip formatter={(v) => formatMoney(Number(v))} />
            <Legend />
          </PieChart>
        </ChartCard>
        <ChartCard title="Recomendaciones → conversión" action="Hechas vs convertidas">
          <BarChart data={conversionData}>
            <CartesianGrid strokeDasharray="3 3" stroke={SOFT_GRID} />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="recommendations" fill="hsl(var(--muted))" radius={[8, 8, 0, 0]} />
            <Bar dataKey="convertedRecommendations" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
            <Line dataKey="conversion" stroke="hsl(var(--primary))" strokeWidth={2} />
          </BarChart>
        </ChartCard>
      </div>
      {topProducts.length > 0 && (
        <ChartCard title="Top productos vendidos" action={`${topProducts.length} productos`}>
          <BarChart data={topProducts.map((p) => ({ name: p.name.length > 24 ? p.name.slice(0, 22) + "…" : p.name, ventas: p.sales, qty: p.qty }))} layout="vertical" margin={{ left: 12, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={SOFT_GRID} />
            <XAxis type="number" tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} />
            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, n) => n === "ventas" ? formatMoney(Number(v)) : v} />
            <Bar dataKey="ventas" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} barSize={18} />
          </BarChart>
        </ChartCard>
      )}
    </section>
  );
}

function TeamPanel({ profiles, users, compact = false }: { profiles: BaKpiProfile[]; users: User[]; compact?: boolean }) {
  const [sort, setSort] = useState("sales");
  const [selectedBa, setSelectedBa] = useState(profiles[0]?.baId ?? "");
  const rows = useMemo(() => profiles.map((p) => {
    const sales = p.history.slice(-4).reduce((s, w) => s + w.sales, 0);
    const transactions = Math.round(sales / 3450);
    const recs = p.history.slice(-4).reduce((s, w) => s + w.recommendations, 0);
    const conv = p.history.slice(-4).reduce((s, w) => s + w.convertedRecommendations, 0);
    return { profile: p, name: users.find((u) => u.id === p.baId)?.name ?? "BA", sales, transactions, ticket: sales / transactions, newConsumers: p.history.slice(-4).reduce((s, w) => s + w.newConsumers, 0), followUps: p.followUpsCompleted, conversion: Math.round((conv / recs) * 100), adoption: p.adoptionScore, activeDays: p.activeDays };
  }).sort((a, b) => String(sort) === "name" ? a.name.localeCompare(b.name) : Number((b as any)[sort]) - Number((a as any)[sort])), [profiles, users, sort]);
  const selected = rows.find((r) => r.profile.baId === selectedBa) ?? rows[0];

  const exportCsv = () => {
    const csv = ["BA,Ventas,Transacciones,Ticket promedio,Registros,Seguimientos,Conversion,Adopcion,Dias activos,Estado", ...rows.map((r) => [r.name, r.sales, r.transactions, Math.round(r.ticket), r.newConsumers, r.followUps, r.conversion, r.adoption, r.profile.activeDays, statusLabel(r.sales / r.profile.monthlyTarget)].join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "desempeno-equipo.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4">
      {!compact && <div className="flex items-center justify-between"><h2 className="font-display text-xl">Tabla comparativa</h2><Button size="sm" onClick={exportCsv}><Download className="size-4 mr-1" /> Exportar CSV</Button></div>}
      {!compact && <TeamSummary rows={rows} />}
      <div className="grid xl:grid-cols-[1fr_360px] gap-4">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>{[["name","BA"],["sales","Ventas"],["transactions","# Trans."],["ticket","Ticket"],["newConsumers","Registros"],["followUps","Seguimientos"],["conversion","Conversión"],["adoption","Adopción"],["activeDays","Días activa"],["status","Estado"]].map(([k,l]) => <th key={k} className="px-4 py-3 text-left font-medium cursor-pointer hover:text-primary" onClick={() => setSort(k)}>{l}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r) => <tr key={r.profile.baId} onClick={() => setSelectedBa(r.profile.baId)} className={cn("cursor-pointer hover:bg-muted/30", selected?.profile.baId === r.profile.baId && "bg-primary/5")}><td className="px-4 py-3 font-medium">{r.name}</td><td className="px-4 py-3">{formatMoney(r.sales)}</td><td className="px-4 py-3">{r.transactions}</td><td className="px-4 py-3">{formatMoney(r.ticket)}</td><td className="px-4 py-3">{r.newConsumers}</td><td className="px-4 py-3">{r.followUps}</td><td className="px-4 py-3">{r.conversion}%</td><td className="px-4 py-3">{r.adoption}</td><td className="px-4 py-3">{r.profile.activeDays}</td><td className="px-4 py-3"><Status ratio={r.sales / r.profile.monthlyTarget} /></td></tr>)}
              </tbody>
            </table>
          </div>
        </Card>
        {selected && !compact && <Card className="p-5"><p className="kpi-label">Detalle seleccionado</p><h3 className="font-display text-2xl mt-1">{selected.name}</h3><div className="mt-4 space-y-3"><MetricBar label="Ventas" value={selected.sales / selected.profile.monthlyTarget * 100} /><MetricBar label="Adopción" value={selected.adoption} /><MetricBar label="Conversión" value={selected.conversion} /><MetricBar label="Actividad" value={selected.activeDays / selected.profile.workDays * 100} /></div></Card>}
      </div>
      {!compact && <ChartCard title="Ventas por BA vs objetivo individual" action="Comparativo tienda"><BarChart data={rows.map((r) => ({ name: r.name.split(" ")[0], ventas: r.sales, objetivo: r.profile.monthlyTarget }))}><CartesianGrid strokeDasharray="3 3" stroke={SOFT_GRID} /><XAxis dataKey="name" /><YAxis tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} /><Tooltip formatter={(v) => formatMoney(Number(v))} /><Bar dataKey="ventas" fill="hsl(var(--primary))" radius={[8,8,0,0]} /><Bar dataKey="objetivo" fill="hsl(var(--accent))" radius={[8,8,0,0]} /></BarChart></ChartCard>}
    </section>
  );
}

function TeamSummary({ rows }: { rows: Array<{ sales: number; adoption: number; conversion: number; transactions: number }> }) {
  const sales = rows.reduce((s, r) => s + r.sales, 0);
  const adoption = Math.round(rows.reduce((s, r) => s + r.adoption, 0) / rows.length);
  const conversion = Math.round(rows.reduce((s, r) => s + r.conversion, 0) / rows.length);
  const tx = rows.reduce((s, r) => s + r.transactions, 0);
  return <div className="grid sm:grid-cols-4 gap-3"><MiniStat label="Ventas tienda" value={formatMoney(sales)} /><MiniStat label="Transacciones" value={String(tx)} /><MiniStat label="Conversión prom." value={`${conversion}%`} /><MiniStat label="Adopción prom." value={`${adoption}/100`} /></div>;
}

function SuccessMetrics({ profiles }: { profiles: BaKpiProfile[] }) {
  const metrics = [
    ["Adopción del sistema", "≥ 90% BAs activas", Math.round(profiles.reduce((s, p) => s + p.activeDays / p.workDays, 0) / profiles.length * 100), 90],
    ["Perfiles completos", "≥ 90% campos clave", 92, 90],
    ["Incremento en ticket promedio", "+10% vs período anterior", 12, 10],
    ["Seguimientos proactivos", "≥ 70% clientas contactadas", 74, 70],
    ["Citas completadas vs agendadas", "≥ 80%", 81, 80],
    ["Nuevos registros por BA/mes", "Objetivo configurable", 17, 16],
  ] as const;
  return <section className="space-y-3"><h2 className="font-display text-xl">Métricas de Éxito del Proyecto</h2><Card className="p-4 overflow-x-auto"><table className="w-full text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="text-left py-2">Métrica</th><th className="text-left py-2">Meta</th><th className="text-left py-2">Actual</th><th className="text-left py-2">Estado</th><th className="text-left py-2">Tendencia</th></tr></thead><tbody>{metrics.map((m, i) => <tr key={m[0]}><td className="py-3 font-medium">{m[0]}</td><td>{m[1]}</td><td>{m[2]}{i === 5 ? "" : "%"}</td><td><Status ratio={m[2] / m[3]} /></td><td><Sparkline values={[m[2]-7,m[2]-4,m[2]-5,m[2]-2,m[2]-1,m[2]+1,m[2]]} /></td></tr>)}</tbody></table></Card></section>;
}

function ChartCard({ title, action, children }: { title: string; action?: string; children: React.ReactElement }) {
  return <Card className="p-5"><div className="flex items-center justify-between gap-3 mb-4"><h3 className="font-display text-lg">{title}</h3>{action && <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">{action}</span>}</div><div className="h-80"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></Card>;
}
function MiniDonut({ done, pending }: { done: number; pending: number }) { const pct = Math.round(done / (done + pending) * 100); return <div className="size-12 rounded-full grid place-items-center text-[10px] font-medium" style={{ background: `conic-gradient(hsl(var(--success)) ${pct}%, hsl(var(--destructive)) 0)` }}><span className="size-8 rounded-full bg-card grid place-items-center">{pct}%</span></div>; }
function statusLabel(ratio: number) { return ratio >= 1 ? "En objetivo" : ratio >= .85 ? "En riesgo" : "Fuera de objetivo"; }
function Status({ ratio }: { ratio: number }) { const tone = ratio >= 1 ? "text-success bg-success/15" : ratio >= .85 ? "text-warning bg-warning/15" : "text-destructive bg-destructive/15"; return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs", tone)}>{ratio >= 1 ? "🟢" : ratio >= .85 ? "🟡" : "🔴"} {statusLabel(ratio)}</span>; }
function Sparkline({ values }: { values: number[] }) { const max = Math.max(...values), min = Math.min(...values); const points = values.map((v, i) => `${i * 18},${28 - ((v - min) / Math.max(max - min, 1)) * 24}`).join(" "); return <svg width="130" height="32" className="overflow-visible"><polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" /><circle cx="108" cy={Number(points.split(" ").at(-1)?.split(",")[1] ?? 0)} r="3" fill="hsl(var(--primary))" /></svg>; }
function MetricBar({ label, value }: { label: string; value: number }) { return <div><div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span>{Math.round(value)}%</span></div><Progress value={Math.min(value, 100)} className="h-2" /></div>; }
function RichTooltip({ active, payload, label, money }: any) { if (!active || !payload?.length) return null; return <div className="rounded-xl border border-border bg-card p-3 shadow-card"><p className="font-medium mb-2">{label}</p>{payload.map((p: any) => <p key={p.dataKey} className="text-xs text-muted-foreground"><span style={{ color: p.color }}>●</span> {p.name}: {money ? formatMoney(Number(p.value)) : p.value}</p>)}</div>; }

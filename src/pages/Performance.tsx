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
import { cn } from "@/lib/utils";
import type { BaKpiProfile, User } from "@/lib/types";

const PERIODS = ["Esta semana", "Este mes", "Últimos 3 meses", "Personalizado"];
const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--gold))"];
const SOFT_GRID = "hsl(var(--border))";

type KpiFocus = "ventas" | "clienteling" | "adopcion";

export default function Performance() {
  const user = useCurrentUser()!;
  const { users, baKpis } = useApp();
  const [period, setPeriod] = useState("Este mes");
  const isBa = user.role === "ba";
  const isDirector = user.role === "zone_supervisor" || user.role === "central_admin";
  const profiles = baKpis.filter((k) => users.find((u) => u.id === k.baId)?.storeId === user.storeId);
  const current = baKpis.find((k) => k.baId === user.id) ?? profiles[0];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          eyebrow="Performance clienteling"
          title={isBa ? "Mi Desempeño" : "Desempeño del Equipo"}
          description="KPIs de ventas, clienteling y adopción con lectura ejecutiva e interacción por período."
        />
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)}>
              {p}
            </Button>
          ))}
        </div>
      </div>

      {isBa && current ? <BaPanel profile={current} user={user} period={period} /> : <TeamPanel profiles={profiles} users={users} />}
      {!isBa && <TeamPanel profiles={profiles} users={users} compact />}
      {isDirector && <SuccessMetrics profiles={profiles} />}
    </div>
  );
}

function BaPanel({ profile, user, period }: { profile: BaKpiProfile; user: User; period: string }) {
  const [focus, setFocus] = useState<KpiFocus>("ventas");
  const monthSales = profile.history.slice(-4).reduce((s, w) => s + w.sales, 0);
  const previousSales = profile.history.slice(0, 4).reduce((s, w) => s + w.sales, 0);
  const transactions = Math.round(monthSales / 3450);
  const averageTicket = monthSales / Math.max(transactions, 1);
  const recs = profile.history.slice(-4).reduce((s, w) => s + w.recommendations, 0);
  const converted = profile.history.slice(-4).reduce((s, w) => s + w.convertedRecommendations, 0);
  const newConsumers = profile.history.slice(-4).reduce((s, w) => s + w.newConsumers, 0);
  const targetPct = Math.round((monthSales / profile.monthlyTarget) * 100);
  const growth = Math.round(((monthSales - previousSales) / previousSales) * 100);

  const cards: KpiCardProps[] = [
    { focus: "ventas", icon: <DollarSign />, label: "Total vendido este mes", value: formatMoney(monthSales), hint: `Objetivo ${formatMoney(profile.monthlyTarget)}`, progress: targetPct, delta: `${growth >= 0 ? "+" : ""}${growth}% vs 4 sem. previas` },
    { focus: "ventas", icon: <FileText />, label: "Transacciones", value: transactions.toString(), hint: "Registradas en app", delta: `${Math.max(0, transactions - 6)} sobre ritmo esperado` },
    { focus: "ventas", icon: <TrendingUp />, label: "Ticket promedio", value: formatMoney(averageTicket), hint: "Por transacción", delta: "mix premium activo" },
    { focus: "ventas", icon: <RefreshCw />, label: "Conversión reco. → venta", value: `${Math.round((converted / recs) * 100)}%`, hint: `${converted} de ${recs} recomendaciones`, progress: (converted / recs) * 100 },
    { focus: "clienteling", icon: <UserPlus />, label: "Nuevas consumidoras", value: `${newConsumers}/${profile.newConsumerTarget}`, hint: "Registros vs objetivo", progress: (newConsumers / profile.newConsumerTarget) * 100 },
    { focus: "clienteling", icon: <FileText />, label: "Seguimientos", value: `${profile.followUpsCompleted}/${profile.followUpsCompleted + profile.followUpsPending}`, hint: "Completados vs pendientes", donut: [profile.followUpsCompleted, profile.followUpsPending] },
    { focus: "clienteling", icon: <CalendarDays />, label: "Cumpleaños atendidos", value: `${profile.birthdaysContacted}/${profile.birthdaysTotal}`, hint: "Alertas del mes", progress: (profile.birthdaysContacted / profile.birthdaysTotal) * 100 },
    { focus: "clienteling", icon: <RefreshCw />, label: "Reposiciones activadas", value: profile.replenishmentsActivated.toString(), hint: "Contactos en fecha", delta: "oportunidad de recompra" },
    { focus: "adopcion", icon: <Smartphone />, label: "Días activa", value: `${profile.activeDays}/${profile.workDays}`, hint: "Días laborales del mes", progress: (profile.activeDays / profile.workDays) * 100 },
    { focus: "adopcion", icon: <Trophy />, label: "Adopción", value: `${profile.adoptionScore}/100`, hint: "Actividad ponderada", progress: profile.adoptionScore },
    { focus: "adopcion", icon: <CalendarDays />, label: "Citas", value: `${profile.appointmentsScheduled}/${profile.appointmentsCompleted}/${profile.appointmentsCancelled}`, hint: "Agendadas / completadas / canceladas" },
    { focus: "adopcion", icon: <Users />, label: "Ranking tienda", value: `#${profile.rank} de ${profile.rankTotal}`, hint: `Puesto #${profile.rank} de ${profile.rankTotal} BAs` },
  ];

  return (
    <div className="space-y-6">
      <ExecutiveHero profile={profile} user={user} monthSales={monthSales} targetPct={targetPct} period={period} />

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

      <Charts profile={profile} focus={focus} setFocus={setFocus} />
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

type KpiCardProps = { focus: KpiFocus; icon: React.ReactNode; label: string; value: string; hint: string; progress?: number; donut?: number[]; delta?: string; active?: boolean; onClick?: () => void };
function KpiCard({ icon, label, value, hint, progress, donut, delta, active, onClick }: KpiCardProps) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card className={cn("p-5 h-full transition-colors duration-150", active ? "border-primary bg-primary/5" : "hover:border-primary/40")}>
        <div className="flex items-start justify-between gap-3">
          <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center [&_svg]:size-5">{icon}</div>
          {donut ? <MiniDonut done={donut[0]} pending={donut[1]} /> : <Sparkline values={[22, 26, 24, 31, 34, 37, 42]} />}
        </div>
        <p className="kpi-label mt-4">{label}</p>
        <p className="kpi-number mt-2">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        {delta && <p className="text-xs text-success mt-2">{delta}</p>}
        {progress !== undefined && <Progress value={Math.min(progress, 100)} className="h-2 mt-4" />}
      </Card>
    </button>
  );
}

function ActionPanel({ profile, focus }: { profile: BaKpiProfile; focus: KpiFocus }) {
  const content = {
    ventas: ["Impulsar fragancias premium en tickets con skincare.", "Cerrar brecha con 3 tickets de alto valor.", "Priorizar consumidoras VIP con compra >60 días."],
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

function Charts({ profile, focus, setFocus }: { profile: BaKpiProfile; focus: KpiFocus; setFocus: (f: KpiFocus) => void }) {
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
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4"><div><p className="kpi-label">Actividad diaria</p><h3 className="font-display text-xl mt-1">Mapa de uso en app</h3></div><ChevronDown className="size-4 text-muted-foreground" /></div>
        <div className="grid grid-cols-7 sm:grid-cols-21 gap-2">
          {activity.map((d) => <div key={d.day} className="aspect-square rounded-md border border-border" title={`Día ${d.day}`} style={{ background: `hsl(var(--primary) / ${0.08 + d.level * 0.18})` }} />)}
        </div>
      </Card>
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

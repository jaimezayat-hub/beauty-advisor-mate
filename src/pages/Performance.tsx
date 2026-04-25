import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Trophy, Users, TrendingUp, CalendarDays, Smartphone, DollarSign, FileText, UserPlus, RefreshCw } from "lucide-react";
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
          description="KPIs de ventas, clienteling y adopción con tendencias simuladas para la demo ejecutiva."
        />
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)}>
              {p}
            </Button>
          ))}
        </div>
      </div>

      {isBa && current ? <BaPanel profile={current} user={user} /> : <TeamPanel profiles={profiles} users={users} />}
      {!isBa && <TeamPanel profiles={profiles} users={users} compact />}
      {isDirector && <SuccessMetrics profiles={profiles} />}
    </div>
  );
}

function BaPanel({ profile }: { profile: BaKpiProfile; user: User }) {
  const monthSales = profile.history.slice(-4).reduce((s, w) => s + w.sales, 0);
  const transactions = Math.round(monthSales / 3450);
  const averageTicket = monthSales / Math.max(transactions, 1);
  const recs = profile.history.slice(-4).reduce((s, w) => s + w.recommendations, 0);
  const converted = profile.history.slice(-4).reduce((s, w) => s + w.convertedRecommendations, 0);
  const newConsumers = profile.history.slice(-4).reduce((s, w) => s + w.newConsumers, 0);

  return (
    <div className="space-y-6">
      <KpiSection title="Ventas" cards={[
        { icon: <DollarSign />, label: "Total vendido este mes", value: formatMoney(monthSales), hint: `Objetivo ${formatMoney(profile.monthlyTarget)}`, progress: (monthSales / profile.monthlyTarget) * 100 },
        { icon: <FileText />, label: "Transacciones", value: transactions.toString(), hint: "Registradas en app" },
        { icon: <TrendingUp />, label: "Ticket promedio", value: formatMoney(averageTicket), hint: "Por transacción" },
        { icon: <RefreshCw />, label: "Conversión reco. → venta", value: `${Math.round((converted / recs) * 100)}%`, hint: `${converted} de ${recs} recomendaciones` },
      ]} />
      <KpiSection title="Clienteling" cards={[
        { icon: <UserPlus />, label: "Nuevas consumidoras", value: `${newConsumers}/${profile.newConsumerTarget}`, hint: "Registros vs objetivo", progress: (newConsumers / profile.newConsumerTarget) * 100 },
        { icon: <FileText />, label: "Seguimientos", value: `${profile.followUpsCompleted}/${profile.followUpsCompleted + profile.followUpsPending}`, hint: "Completados vs pendientes", donut: [profile.followUpsCompleted, profile.followUpsPending] },
        { icon: <CalendarDays />, label: "Cumpleaños atendidos", value: `${profile.birthdaysContacted}/${profile.birthdaysTotal}`, hint: "Alertas del mes" },
        { icon: <RefreshCw />, label: "Reposiciones activadas", value: profile.replenishmentsActivated.toString(), hint: "Contactos en fecha" },
      ]} />
      <KpiSection title="Adopción y Actividad" cards={[
        { icon: <Smartphone />, label: "Días activa", value: `${profile.activeDays}/${profile.workDays}`, hint: "Días laborales del mes", progress: (profile.activeDays / profile.workDays) * 100 },
        { icon: <Trophy />, label: "Puntuación de adopción", value: `${profile.adoptionScore}/100`, hint: "Actividad ponderada", progress: profile.adoptionScore },
        { icon: <CalendarDays />, label: "Citas", value: `${profile.appointmentsScheduled}/${profile.appointmentsCompleted}/${profile.appointmentsCancelled}`, hint: "Agendadas / completadas / canceladas" },
        { icon: <Users />, label: "Ranking tienda", value: `#${profile.rank} de ${profile.rankTotal}`, hint: `Estás en el puesto #${profile.rank} de ${profile.rankTotal} BAs` },
      ]} />
      <Charts profile={profile} />
    </div>
  );
}

function KpiSection({ title, cards }: { title: string; cards: KpiCardProps[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl">{title}</h2>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((c) => <KpiCard key={c.label} {...c} />)}
      </div>
    </section>
  );
}

type KpiCardProps = { icon: React.ReactNode; label: string; value: string; hint: string; progress?: number; donut?: number[] };
function KpiCard({ icon, label, value, hint, progress, donut }: KpiCardProps) {
  return (
    <Card className="p-5 shadow-card animate-slide-up">
      <div className="flex items-start justify-between gap-3">
        <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center [&_svg]:size-5">{icon}</div>
        {donut && <MiniDonut done={donut[0]} pending={donut[1]} />}
      </div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mt-4">{label}</p>
      <p className="font-display text-3xl mt-1 tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      {progress !== undefined && <Progress value={Math.min(progress, 100)} className="h-2 mt-4" />}
    </Card>
  );
}

function Charts({ profile }: { profile: BaKpiProfile }) {
  const category = Object.entries(profile.categorySales).map(([name, value]) => ({ name, value }));
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <ChartCard title="Ventas por semana">
        <BarChart data={profile.history}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="week" /><YAxis /><Tooltip formatter={(v) => formatMoney(Number(v))} /><Bar dataKey="sales" fill="hsl(var(--primary))" radius={[6,6,0,0]} /><Line type="monotone" dataKey="salesTarget" stroke="hsl(var(--gold))" strokeWidth={2} /></BarChart>
      </ChartCard>
      <ChartCard title="Nuevos registros por semana">
        <LineChart data={profile.history}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="week" /><YAxis /><Tooltip /><Line dataKey="newConsumers" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} /></LineChart>
      </ChartCard>
      <ChartCard title="Distribución de ventas por categoría">
        <PieChart><Pie data={category} dataKey="value" innerRadius={58} outerRadius={86} paddingAngle={3}>{category.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip formatter={(v) => formatMoney(Number(v))} /></PieChart>
      </ChartCard>
      <ChartCard title="Tasa de conversión de recomendaciones">
        <BarChart data={profile.history}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="week" /><YAxis /><Tooltip /><Bar dataKey="recommendations" fill="hsl(var(--muted))" radius={[6,6,0,0]} /><Bar dataKey="convertedRecommendations" fill="hsl(var(--success))" radius={[6,6,0,0]} /></BarChart>
      </ChartCard>
    </div>
  );
}

function TeamPanel({ profiles, users, compact = false }: { profiles: BaKpiProfile[]; users: User[]; compact?: boolean }) {
  const [sort, setSort] = useState("sales");
  const rows = useMemo(() => profiles.map((p) => {
    const sales = p.history.slice(-4).reduce((s, w) => s + w.sales, 0);
    const transactions = Math.round(sales / 3450);
    const recs = p.history.slice(-4).reduce((s, w) => s + w.recommendations, 0);
    const conv = p.history.slice(-4).reduce((s, w) => s + w.convertedRecommendations, 0);
    return { profile: p, name: users.find((u) => u.id === p.baId)?.name ?? "BA", sales, transactions, ticket: sales / transactions, newConsumers: p.history.slice(-4).reduce((s, w) => s + w.newConsumers, 0), followUps: p.followUpsCompleted, conversion: Math.round((conv / recs) * 100), adoption: p.adoptionScore };
  }).sort((a, b) => Number((b as any)[sort]) - Number((a as any)[sort])), [profiles, users, sort]);

  const exportCsv = () => {
    const csv = ["BA,Ventas,Transacciones,Ticket promedio,Registros,Seguimientos,Conversion,Adopcion,Dias activos,Estado", ...rows.map((r) => [r.name, r.sales, r.transactions, Math.round(r.ticket), r.newConsumers, r.followUps, r.conversion, r.adoption, r.profile.activeDays, statusLabel(r.sales / r.profile.monthlyTarget)].join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "desempeno-equipo.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4">
      {!compact && <div className="flex items-center justify-between"><h2 className="font-display text-xl">Tabla comparativa</h2><Button size="sm" onClick={exportCsv}><Download className="size-4 mr-1" /> Exportar CSV</Button></div>}
      <Card className="shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>{[["name","BA"],["sales","Ventas"],["transactions","# Trans."],["ticket","Ticket"],["newConsumers","Registros"],["followUps","Seguimientos"],["conversion","Conversión"],["adoption","Adopción"],["activeDays","Días activa"],["status","Estado"]].map(([k,l]) => <th key={k} className="px-4 py-3 text-left font-medium cursor-pointer" onClick={() => setSort(k)}>{l}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => <tr key={r.profile.baId} className="hover:bg-muted/30"><td className="px-4 py-3 font-medium">{r.name}</td><td className="px-4 py-3">{formatMoney(r.sales)}</td><td className="px-4 py-3">{r.transactions}</td><td className="px-4 py-3">{formatMoney(r.ticket)}</td><td className="px-4 py-3">{r.newConsumers}</td><td className="px-4 py-3">{r.followUps}</td><td className="px-4 py-3">{r.conversion}%</td><td className="px-4 py-3">{r.adoption}</td><td className="px-4 py-3">{r.profile.activeDays}</td><td className="px-4 py-3"><Status ratio={r.sales / r.profile.monthlyTarget} /></td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
      {!compact && <ChartCard title="Ventas por BA vs objetivo individual"><BarChart data={rows.map((r) => ({ name: r.name.split(" ")[0], ventas: r.sales, objetivo: r.profile.monthlyTarget }))}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(v) => formatMoney(Number(v))} /><Bar dataKey="ventas" fill="hsl(var(--primary))" radius={[6,6,0,0]} /><Bar dataKey="objetivo" fill="hsl(var(--accent))" radius={[6,6,0,0]} /></BarChart></ChartCard>}
    </section>
  );
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
  return <section className="space-y-3"><h2 className="font-display text-xl">Métricas de Éxito del Proyecto</h2><Card className="p-4 shadow-card overflow-x-auto"><table className="w-full text-sm"><thead className="text-xs uppercase tracking-widest text-muted-foreground"><tr><th className="text-left py-2">Métrica</th><th className="text-left py-2">Meta</th><th className="text-left py-2">Actual</th><th className="text-left py-2">Estado</th><th className="text-left py-2">Tendencia</th></tr></thead><tbody className="divide-y divide-border">{metrics.map((m, i) => <tr key={m[0]}><td className="py-3 font-medium">{m[0]}</td><td>{m[1]}</td><td>{m[2]}{i === 5 ? "" : "%"}</td><td><Status ratio={m[2] / m[3]} /></td><td><Sparkline values={[m[2]-7,m[2]-4,m[2]-5,m[2]-2,m[2]-1,m[2]+1,m[2]]} /></td></tr>)}</tbody></table></Card></section>;
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return <Card className="p-5 shadow-card"><h3 className="font-display text-lg mb-4">{title}</h3><div className="h-72"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></Card>;
}
function MiniDonut({ done, pending }: { done: number; pending: number }) { const pct = Math.round(done / (done + pending) * 100); return <div className="size-12 rounded-full grid place-items-center text-[10px] font-medium" style={{ background: `conic-gradient(hsl(var(--success)) ${pct}%, hsl(var(--destructive)) 0)` }}><span className="size-8 rounded-full bg-card grid place-items-center">{pct}%</span></div>; }
function statusLabel(ratio: number) { return ratio >= 1 ? "En objetivo" : ratio >= .85 ? "En riesgo" : "Fuera de objetivo"; }
function Status({ ratio }: { ratio: number }) { const tone = ratio >= 1 ? "text-success bg-success/15" : ratio >= .85 ? "text-warning bg-warning/15" : "text-destructive bg-destructive/15"; return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs", tone)}>{ratio >= 1 ? "🟢" : ratio >= .85 ? "🟡" : "🔴"} {statusLabel(ratio)}</span>; }
function Sparkline({ values }: { values: number[] }) { const max = Math.max(...values), min = Math.min(...values); const points = values.map((v, i) => `${i * 18},${28 - ((v - min) / Math.max(max - min, 1)) * 24}`).join(" "); return <svg width="130" height="32" className="overflow-visible"><polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" /><circle cx="108" cy={Number(points.split(" ").at(-1)?.split(",")[1] ?? 0)} r="3" fill="hsl(var(--primary))" /></svg>; }

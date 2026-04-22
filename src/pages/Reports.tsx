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
import { PageHeader } from "@/components/clienteling/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SegmentBadge } from "@/components/clienteling/SegmentBadge";
import { Download, TrendingUp, Users } from "lucide-react";
import { downloadCSV } from "@/lib/csv";
import { formatDate, formatMoney, fullName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const RANGES = [
  ["hoy", "Hoy"],
  ["semana", "Esta semana"],
  ["mes", "Este mes"],
  ["trimestre", "Trimestre"],
] as const;

type RangeKey = (typeof RANGES)[number][0];

function rangeStart(r: RangeKey): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (r === "hoy") return d;
  if (r === "semana") { d.setDate(d.getDate() - 7); return d; }
  if (r === "mes") { d.setDate(1); return d; }
  d.setMonth(d.getMonth() - 3);
  return d;
}

export default function Reports() {
  const user = useCurrentUser()!;
  const { consumers, purchases, users, appointments, followUps, recommendations } = useApp();
  const [range, setRange] = useState<RangeKey>("mes");
  const [tab, setTab] = useState<"dashboard" | "consumidoras" | "ba" | "adopcion">("dashboard");

  const start = rangeStart(range);
  const inRange = <T extends { date: string }>(items: T[]) =>
    items.filter((x) => new Date(x.date) >= start);

  const periodPurchases = inRange(purchases);
  const sellOut = periodPurchases.reduce((s, p) => s + p.total, 0);
  const targetMx = 850000;
  const targetPct = Math.min(100, Math.round((sellOut / targetMx) * 100));
  const newConsumers = consumers.filter((c) => new Date(c.createdAt) >= start);
  const periodAppts = appointments.filter((a) => new Date(a.date) >= start);
  const periodFollow = inRange(followUps);

  // Sales by BA
  const bas = users.filter((u) => u.role === "ba");
  const salesByBa = bas.map((b) => ({
    name: b.name.split(" ")[0],
    ventas: periodPurchases.filter((p) => p.baId === b.id).reduce((s, p) => s + p.total, 0),
  }));

  // Category mix
  // category info comes from product seed; we derive from line names heuristic via SKU prefix
  const catMix = (() => {
    let s = 0, m = 0, f = 0;
    periodPurchases.forEach((p) =>
      p.lines.forEach((l) => {
        const sku = l.sku;
        const amt = l.price * l.qty;
        if (sku.includes("AGV") || sku.includes("RNM") || sku.includes("PUR")) s += amt;
        else if (sku.includes("LAV") || sku.includes("IDO") || sku.includes("LIB") || sku.includes("MYS")) f += amt;
        else m += amt;
      }),
    );
    return [
      { name: "Skincare", value: Math.round(s) },
      { name: "Makeup", value: Math.round(m) },
      { name: "Fragancia", value: Math.round(f) },
    ];
  })();

  // Trend (8 weeks)
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const wkEnd = new Date();
    wkEnd.setHours(23, 59, 59, 999);
    wkEnd.setDate(wkEnd.getDate() - (7 - i) * 7);
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
    return {
      semana: `S${i + 1}`,
      nuevas: consumersWeek.length,
      recurrentes: purchasesWeek.filter((p) => !consumersWeek.some((c) => c.id === p.consumerId)).length,
      adopcion: bas.length === 0 ? 0 : Math.round((baActive.size / bas.length) * 100),
    };
  });

  // Adoption
  const todayKey = new Date().toDateString();
  const baActiveToday = new Set(
    purchases.filter((p) => new Date(p.date).toDateString() === todayKey).map((p) => p.baId),
  );
  const baActiveWeek = new Set(inRange(purchases).map((p) => p.baId));
  const adoptionToday = bas.length ? Math.round((baActiveToday.size / bas.length) * 100) : 0;
  const adoptionWeek = bas.length ? Math.round((baActiveWeek.size / bas.length) * 100) : 0;

  // BA performance
  const baPerf = bas.map((b) => {
    const tx = periodPurchases.filter((p) => p.baId === b.id);
    const recs = recommendations.filter((r) => r.baId === b.id && new Date(r.date) >= start);
    const fups = followUps.filter((f) => f.baId === b.id && new Date(f.date) >= start);
    const newC = consumers.filter((c) => c.assignedBaId === b.id && new Date(c.createdAt) >= start);
    const adoption = baActiveWeek.has(b.id) ? "Alta" : adoptionWeek > 0 ? "Media" : "Baja";
    return {
      ba: b,
      tx: tx.length,
      total: tx.reduce((s, p) => s + p.total, 0),
      newC: newC.length,
      fups: fups.length,
      recs: recs.length,
      adoption,
    };
  });

  const exportConsumers = () => {
    const rows = consumers.map((c) => {
      const ba = users.find((u) => u.id === c.assignedBaId);
      return {
        Nombre: c.firstName,
        Apellido: c.lastName,
        Teléfono: c.phone,
        Correo: c.email,
        FechaNacimiento: formatDate(c.birthDate),
        Segmentación: c.segment,
        Marca: c.brand === "ysl" ? "YSL" : "Lancôme",
        BA: ba?.name ?? "",
        ClientaDesde: formatDate(c.createdAt),
        ÚltimoContacto: formatDate(c.lastContactAt),
        ÚltimaTransacción: formatDate(c.lastTransactionAt),
      };
    });
    downloadCSV(`consumidoras_${new Date().toISOString().slice(0, 10)}`, rows);
    toast.success("Lista exportada");
  };

  const exportBaPerf = () => {
    const rows = baPerf.map((r) => ({
      BA: r.ba.name,
      Marca: r.ba.brand === "ysl" ? "YSL" : "Lancôme",
      Transacciones: r.tx,
      "Total MXN": r.total,
      NuevosRegistros: r.newC,
      Seguimientos: r.fups,
      Recomendaciones: r.recs,
      Adopción: r.adoption,
    }));
    downloadCSV(`desempeno_ba_${new Date().toISOString().slice(0, 10)}`, rows);
    toast.success("Reporte exportado");
  };

  const COLORS = ["hsl(var(--primary))", "hsl(var(--gold))", "hsl(var(--brand-accent))"];

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      <PageHeader
        eyebrow="Reportes y analítica"
        title="Dashboard Gerente"
        description="KPIs, ventas y tasa de adopción del counter."
        actions={
          <div className="flex bg-muted rounded-lg p-0.5">
            {RANGES.map(([k, l]) => (
              <button
                key={k}
                onClick={() => setRange(k)}
                className={cn(
                  "px-3 py-1.5 text-xs uppercase tracking-widest rounded-md transition",
                  range === k ? "bg-background shadow-sm font-medium" : "text-muted-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex gap-1 border-b border-border">
        {([
          ["dashboard", "Dashboard"],
          ["adopcion", "Adopción"],
          ["consumidoras", "Lista Consumidoras"],
          ["ba", "Desempeño BA"],
        ] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "px-4 py-3 text-sm border-b-2 -mb-px transition",
              tab === k ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="space-y-6 animate-fade-in">
          {/* KPIs */}
          <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <Kpi label="Avance objetivo" value={`${targetPct}%`} sub={formatMoney(sellOut)} accent />
            <Kpi label="Sell-out" value={formatMoney(sellOut)} />
            <Kpi label="Transacciones" value={periodPurchases.length} />
            <Kpi label="Nuevos registros" value={newConsumers.length} />
            <Kpi label="Seguimientos" value={periodFollow.length} />
            <Kpi label="Citas" value={periodAppts.length} />
          </section>

          {/* Goal bar */}
          <Card className="p-6 shadow-card">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Objetivo del período</span>
              <span className="font-display">{formatMoney(sellOut)} / {formatMoney(targetMx)}</span>
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
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="ventas" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6 shadow-card">
              <ChartHeader title="Mix por categoría" />
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={catMix} dataKey="value" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {catMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
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

          <Card className="p-6 shadow-card">
            <ChartHeader title="Nuevas vs. recurrentes (8 semanas)" />
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={weeks}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="semana" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="nuevas" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="recurrentes" stroke="hsl(var(--gold))" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {tab === "adopcion" && (
        <div className="space-y-6 animate-fade-in">
          <Card className="p-8 shadow-luxe gradient-brand text-primary-foreground">
            <p className="text-[11px] uppercase tracking-[0.3em] opacity-80">Métrica héroe</p>
            <h2 className="font-display text-2xl mt-1">Tasa de adopción</h2>
            <div className="grid grid-cols-3 gap-6 mt-6">
              <Hero label="Hoy" value={`${adoptionToday}%`} />
              <Hero label="Esta semana" value={`${adoptionWeek}%`} />
              <Hero label="BAs activas" value={`${baActiveWeek.size}/${bas.length}`} />
            </div>
          </Card>

          <Card className="p-6 shadow-card">
            <ChartHeader title="Adopción últimas 8 semanas" />
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={weeks}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="semana" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v) => `${v}%`} />
                <Line type="monotone" dataKey="adopcion" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="overflow-hidden shadow-card">
            <div className="p-5 border-b border-border flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <h3 className="font-display text-lg">Estado por BA</h3>
            </div>
            <ul className="divide-y divide-border">
              {bas.map((b) => {
                const active = baActiveWeek.has(b.id);
                return (
                  <li key={b.id} className="flex items-center gap-3 p-4">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.brand === "ysl" ? "YSL Beauty" : "Lancôme"}
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
          </Card>
        </div>
      )}

      {tab === "consumidoras" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-end">
            <Button onClick={exportConsumers}><Download className="size-4 mr-1.5" /> Exportar Excel/CSV</Button>
          </div>
          <Card className="overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Consumidora</th>
                    <th className="text-left px-4 py-3 font-medium">Segmento</th>
                    <th className="text-left px-4 py-3 font-medium">Marca</th>
                    <th className="text-left px-4 py-3 font-medium">BA</th>
                    <th className="text-left px-4 py-3 font-medium">Clienta desde</th>
                    <th className="text-left px-4 py-3 font-medium">Último contacto</th>
                    <th className="text-left px-4 py-3 font-medium">Última compra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {consumers.map((c) => {
                    const ba = users.find((u) => u.id === c.assignedBaId);
                    return (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link to={`/consumidoras/${c.id}`} className="hover:underline font-medium">
                            {fullName(c.firstName, c.lastName)}
                          </Link>
                          <p className="text-xs text-muted-foreground">{c.phone}</p>
                        </td>
                        <td className="px-4 py-3"><SegmentBadge segment={c.segment} size="sm" /></td>
                        <td className="px-4 py-3 text-xs uppercase tracking-widest">{c.brand === "ysl" ? "YSL" : "Lancôme"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{ba?.name.split(" ")[0] ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(c.createdAt)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(c.lastContactAt)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(c.lastTransactionAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "ba" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-end">
            <Button onClick={exportBaPerf}><Download className="size-4 mr-1.5" /> Exportar</Button>
          </div>
          <Card className="overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">BA</th>
                    <th className="text-right px-4 py-3 font-medium">Trans.</th>
                    <th className="text-right px-4 py-3 font-medium">Total</th>
                    <th className="text-right px-4 py-3 font-medium">Nuevas</th>
                    <th className="text-right px-4 py-3 font-medium">Seg.</th>
                    <th className="text-right px-4 py-3 font-medium">Reco.</th>
                    <th className="text-left px-4 py-3 font-medium">Adopción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {baPerf.map((r) => (
                    <tr key={r.ba.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.ba.name}</p>
                        <p className="text-xs text-muted-foreground">{r.ba.brand === "ysl" ? "YSL" : "Lancôme"}</p>
                      </td>
                      <td className="px-4 py-3 text-right">{r.tx}</td>
                      <td className="px-4 py-3 text-right font-display">{formatMoney(r.total)}</td>
                      <td className="px-4 py-3 text-right">{r.newC}</td>
                      <td className="px-4 py-3 text-right">{r.fups}</td>
                      <td className="px-4 py-3 text-right">{r.recs}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          r.adoption === "Alta" ? "bg-success/15 text-success" :
                          r.adoption === "Media" ? "bg-gold/15 text-gold" : "bg-destructive/15 text-destructive",
                        )}>
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
      )}

      <TrendingUp className="hidden" />
    </div>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <Card className={cn("p-4 shadow-card", accent && "bg-gradient-brand text-primary-foreground")}>
      <p className={cn("text-[10px] uppercase tracking-[0.25em]", accent ? "opacity-80" : "text-muted-foreground")}>{label}</p>
      <p className="font-display text-2xl mt-1 leading-none">{value}</p>
      {sub && <p className={cn("text-[11px] mt-1.5", accent ? "opacity-80" : "text-muted-foreground")}>{sub}</p>}
    </Card>
  );
}

function Hero({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest opacity-80">{label}</p>
      <p className="font-display text-5xl mt-1 leading-none">{value}</p>
    </div>
  );
}

function ChartHeader({ title }: { title: string }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Gráfica</p>
      <h3 className="font-display text-lg">{title}</h3>
    </div>
  );
}
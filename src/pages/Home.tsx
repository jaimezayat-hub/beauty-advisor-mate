import { useApp, useCurrentUser } from "@/store/useApp";
import { PageHeader } from "@/components/clienteling/PageHeader";
import { Card } from "@/components/ui/card";
import { Calendar, Cake, RefreshCw, AlertTriangle, Sparkles, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { daysBetween, daysUntilNextBirthday, formatDateTime, fullName } from "@/lib/format";
import { ConsumerAvatar } from "@/components/clienteling/Avatar";
import { SegmentBadge } from "@/components/clienteling/SegmentBadge";
import { Button } from "@/components/ui/button";

export default function Home() {
  const user = useCurrentUser()!;
  const { consumers, appointments, purchases, recommendations } = useApp();

  const myConsumers = consumers.filter((c) => c.assignedBaId === user.id);

  const today = new Date();
  const todayKey = today.toDateString();
  const todaysAppts = appointments
    .filter(
      (a) => a.baId === user.id && new Date(a.date).toDateString() === todayKey,
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const birthdaySoon = myConsumers
    .map((c) => ({ c, days: daysUntilNextBirthday(c.birthDate) }))
    .filter(({ days }) => days >= 0 && days <= 7)
    .sort((a, b) => a.days - b.days);

  const replenishment = myConsumers.filter((c) => {
    if (!c.lastTransactionAt) return false;
    const d = daysBetween(c.lastTransactionAt);
    return d >= 30 && d <= 90;
  });

  const atRisk = myConsumers.filter(
    (c) => c.lastContactAt && daysBetween(c.lastContactAt) > 60,
  );

  // Week stats
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const myWeekPurchases = purchases.filter(
    (p) => p.baId === user.id && new Date(p.date) >= weekStart,
  );
  const myWeekRecs = recommendations.filter(
    (r) => r.baId === user.id && new Date(r.date) >= weekStart,
  );
  const myWeekNew = myConsumers.filter(
    (c) => new Date(c.createdAt) >= weekStart,
  );

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  })();

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      <PageHeader
        eyebrow={`${formatDateLong(today)}`}
        title={`${greeting}, ${user.name.split(" ")[0]}.`}
        description="Esto es lo que necesitas saber para tu día en el counter."
        actions={
          <Button asChild size="lg">
            <Link to="/consumidoras/nueva">+ Nueva consumidora</Link>
          </Button>
        }
      />

      {/* KPI strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Mis consumidoras"
          value={myConsumers.length}
          delta={`${myWeekNew.length} nuevas esta semana`}
        />
        <KpiCard
          label="Compras (7d)"
          value={myWeekPurchases.length}
          delta={formatMoneyShort(myWeekPurchases.reduce((s, p) => s + p.total, 0))}
        />
        <KpiCard
          label="Recomendaciones"
          value={myWeekRecs.length}
          delta="últimos 7 días"
        />
        <KpiCard
          label="Citas hoy"
          value={todaysAppts.length}
          delta={todaysAppts.length ? "Próximas en agenda" : "Sin citas hoy"}
          accent
        />
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's appts */}
        <Card className="lg:col-span-2 p-6 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Hoy en cabina
              </p>
              <h2 className="font-display text-2xl mt-1">Citas del día</h2>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/agenda">
                Ver agenda <ArrowUpRight className="size-3.5 ml-1" />
              </Link>
            </Button>
          </div>
          {todaysAppts.length === 0 ? (
            <EmptyMini icon={<Calendar className="size-5" />} text="Sin citas confirmadas para hoy." />
          ) : (
            <ul className="divide-y divide-border">
              {todaysAppts.map((a) => {
                const c = consumers.find((x) => x.id === a.consumerId);
                if (!c) return null;
                return (
                  <li key={a.id}>
                    <Link
                      to={`/consumidoras/${c.id}`}
                      className="flex items-center gap-4 py-3.5 hover:bg-muted/40 -mx-2 px-2 rounded transition"
                    >
                      <div className="text-right shrink-0 w-16">
                        <p className="font-display text-xl">
                          {new Date(a.date).getHours().toString().padStart(2, "0")}:
                          {new Date(a.date).getMinutes().toString().padStart(2, "0")}
                        </p>
                      </div>
                      <ConsumerAvatar firstName={c.firstName} lastName={c.lastName} size={40} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {fullName(c.firstName, c.lastName)}
                        </p>
                        <p className="text-xs text-muted-foreground">{a.type}</p>
                      </div>
                      <SegmentBadge segment={c.segment} size="sm" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Alerts */}
        <Card className="p-6 shadow-card">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              Acción recomendada
            </p>
            <h2 className="font-display text-2xl mt-1">Alertas</h2>
          </div>
          <div className="space-y-3">
            <AlertChip
              icon={<Cake className="size-4" />}
              tone="accent"
              count={birthdaySoon.length}
              label="Cumpleaños esta semana"
            />
            <AlertChip
              icon={<RefreshCw className="size-4" />}
              tone="primary"
              count={replenishment.length}
              label="Reposiciones sugeridas"
            />
            <AlertChip
              icon={<AlertTriangle className="size-4" />}
              tone="destructive"
              count={atRisk.length}
              label="En riesgo (>60d)"
            />
          </div>

          {birthdaySoon.length > 0 && (
            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                Próximos cumpleaños
              </p>
              <ul className="space-y-2">
                {birthdaySoon.slice(0, 3).map(({ c, days }) => (
                  <li key={c.id}>
                    <Link
                      to={`/consumidoras/${c.id}`}
                      className="flex items-center gap-3 py-1.5 hover:bg-muted/40 -mx-2 px-2 rounded"
                    >
                      <ConsumerAvatar firstName={c.firstName} lastName={c.lastName} size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {fullName(c.firstName, c.lastName)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {days === 0 ? "Hoy 🎂" : `en ${days}d`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* Recent consumers */}
      <Card className="p-6 shadow-card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              Atendidas recientemente
            </p>
            <h2 className="font-display text-2xl mt-1">Acceso rápido</h2>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/consumidoras">
              Ver todas <ArrowUpRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...myConsumers]
            .sort((a, b) =>
              (b.lastContactAt ?? "").localeCompare(a.lastContactAt ?? ""),
            )
            .slice(0, 6)
            .map((c) => (
              <Link
                key={c.id}
                to={`/consumidoras/${c.id}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/50 hover:shadow-card transition group"
              >
                <ConsumerAvatar firstName={c.firstName} lastName={c.lastName} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {fullName(c.firstName, c.lastName)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Última visita: {formatDateTime(c.lastContactAt)}
                  </p>
                </div>
                <SegmentBadge segment={c.segment} size="sm" />
              </Link>
            ))}
        </div>
      </Card>

      <Sparkles className="hidden" />
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  accent,
}: {
  label: string;
  value: number | string;
  delta?: string;
  accent?: boolean;
}) {
  return (
    <Card className={`p-5 shadow-card ${accent ? "bg-gradient-brand text-primary-foreground" : ""}`}>
      <p className={`text-[11px] uppercase tracking-[0.3em] ${accent ? "opacity-80" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className="font-display text-4xl mt-2 leading-none">{value}</p>
      {delta && (
        <p className={`text-xs mt-2 ${accent ? "opacity-80" : "text-muted-foreground"}`}>
          {delta}
        </p>
      )}
    </Card>
  );
}

function AlertChip({
  icon,
  count,
  label,
  tone,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  tone: "accent" | "primary" | "destructive";
}) {
  const toneClass = {
    accent: "bg-accent/40 text-accent-foreground border-accent/60",
    primary: "bg-primary/10 text-primary border-primary/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/30",
  }[tone];
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${toneClass}`}>
      <div className="size-8 rounded-md bg-background/30 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
      </div>
      <span className="font-display text-2xl leading-none">{count}</span>
    </div>
  );
}

function EmptyMini({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-muted-foreground py-12 text-sm gap-2">
      <div className="size-10 rounded-full bg-muted flex items-center justify-center">{icon}</div>
      {text}
    </div>
  );
}

function formatMoneyShort(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k MXN`;
  return `$${n.toLocaleString("es-MX")} MXN`;
}

function formatDateLong(d: Date) {
  return d.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
import { useMemo, useState } from "react";
import { useApp, useCurrentUser } from "@/store/useApp";
import { PageHeader } from "@/components/clienteling/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConsumerPicker } from "@/components/clienteling/ConsumerPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Download, Plus } from "lucide-react";
import type { Appointment, AppointmentStatus, AppointmentType, Consumer } from "@/lib/types";
import { formatDate, fullName } from "@/lib/format";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const TYPES: AppointmentType[] = [
  "Servicio de Cabina",
  "Facial",
  "Evento Aniversario",
  "Cabina VIP",
  "Seguimiento de Productos",
  "Masterclass",
  "Otro",
];

const TYPE_COLORS: Record<AppointmentType, string> = {
  "Servicio de Cabina": "bg-primary/15 text-primary border-primary/30",
  "Facial": "bg-accent/40 text-accent-foreground border-accent/60",
  "Evento Aniversario": "bg-gold/15 text-gold border-gold/40",
  "Cabina VIP": "bg-gold/20 text-gold border-gold/50",
  "Seguimiento de Productos": "bg-muted text-muted-foreground border-border",
  "Masterclass": "bg-success/15 text-success border-success/40",
  "Otro": "bg-muted text-muted-foreground border-border",
};

export default function Agenda() {
  const user = useCurrentUser()!;
  const { appointments, consumers, users, addAppointment } = useApp();

  const [view, setView] = useState<"semana" | "mes">("semana");
  const [scope, setScope] = useState<"mias" | "tienda">(user.role === "ba" ? "mias" : "tienda");
  const [anchor, setAnchor] = useState(() => new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);

  const visible = useMemo(
    () => appointments.filter((a) => (scope === "mias" ? a.baId === user.id : true)),
    [appointments, scope, user.id],
  );

  // Build week
  const weekStart = startOfWeek(anchor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const monthStart = startOfMonth(anchor);
  const monthGridStart = startOfWeek(monthStart);
  const monthDays = Array.from({ length: 42 }, (_, i) => addDays(monthGridStart, i));

  const apptsOn = (d: Date) =>
    visible
      .filter((a) => sameDay(new Date(a.date), d))
      .sort((a, b) => a.date.localeCompare(b.date));

  const exportTable = () => {
    const rows = visible.map((a) => {
      const c = consumers.find((x) => x.id === a.consumerId);
      const ba = users.find((u) => u.id === a.baId);
      return {
        Fecha: formatDate(a.date),
        Hora: new Date(a.date).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
        Consumidora: c ? fullName(c.firstName, c.lastName) : "",
        Teléfono: c?.phone ?? "",
        Tipo: a.type,
        BA: ba?.name ?? "",
        Estado: a.status,
        Notas: a.notes ?? "",
      };
    });
    downloadCSV(`agenda_${new Date().toISOString().slice(0, 10)}`, rows);
    toast.success("Agenda exportada");
  };

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      <PageHeader
        eyebrow="Agenda y citas"
        title="Agenda"
        description="Citas en cabina, masterclasses y eventos VIP."
        actions={
          <>
            <Button variant="outline" onClick={exportTable}>
              <Download className="size-4 mr-1.5" /> Exportar
            </Button>
            <Button
              onClick={() => {
                setDefaultDate(new Date());
                setCreateOpen(true);
              }}
            >
              <Plus className="size-4 mr-1.5" /> Nueva cita
            </Button>
          </>
        }
      />

      <Card className="p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setAnchor(addDays(anchor, view === "semana" ? -7 : -30))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())}>
              Hoy
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setAnchor(addDays(anchor, view === "semana" ? 7 : 30))}
            >
              <ChevronRight className="size-4" />
            </Button>
            <p className="ml-3 font-display text-lg">
              {view === "semana"
                ? `${formatShort(weekStart)} – ${formatShort(addDays(weekStart, 6))}`
                : anchor.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Toggle value={view} options={[["semana", "Semana"], ["mes", "Mes"]] as const} onChange={(v) => setView(v as typeof view)} />
            {user.role !== "ba" && (
              <Toggle value={scope} options={[["mias", "Mías"], ["tienda", "Toda la tienda"]] as const} onChange={(v) => setScope(v as typeof scope)} />
            )}
          </div>
        </div>
      </Card>

      {view === "semana" ? (
        <Card className="p-2 shadow-card overflow-hidden">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((d) => {
              const isToday = sameDay(d, new Date());
              const items = apptsOn(d);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => {
                    setDefaultDate(d);
                    setCreateOpen(true);
                  }}
                  className={cn(
                    "text-left rounded-lg border border-border p-3 min-h-[180px] hover:border-primary/40 transition group",
                    isToday && "bg-primary/5 border-primary/30",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {d.toLocaleDateString("es-MX", { weekday: "short" })}
                    </p>
                    <p
                      className={cn(
                        "font-display text-xl leading-none",
                        isToday && "text-primary",
                      )}
                    >
                      {d.getDate()}
                    </p>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {items.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition">
                        + Cita
                      </p>
                    ) : (
                      items.slice(0, 4).map((a) => {
                        const c = consumers.find((x) => x.id === a.consumerId);
                        return (
                          <div
                            key={a.id}
                            className={cn(
                              "text-[10px] rounded px-1.5 py-1 border truncate",
                              TYPE_COLORS[a.type],
                            )}
                          >
                            <span className="font-semibold">
                              {new Date(a.date).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                            </span>{" "}
                            {c ? `${c.firstName} ${c.lastName.charAt(0)}.` : ""}
                          </div>
                        );
                      })
                    )}
                    {items.length > 4 && (
                      <p className="text-[10px] text-muted-foreground">
                        +{items.length - 4} más
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-2 shadow-card">
          <div className="grid grid-cols-7">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
              <p key={d} className="text-center text-[10px] uppercase tracking-widest text-muted-foreground py-2">
                {d}
              </p>
            ))}
            {monthDays.map((d) => {
              const isCur = d.getMonth() === anchor.getMonth();
              const isToday = sameDay(d, new Date());
              const items = apptsOn(d);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => {
                    setDefaultDate(d);
                    setCreateOpen(true);
                  }}
                  className={cn(
                    "min-h-[88px] border border-border/40 p-1.5 text-left hover:bg-muted/40 transition",
                    !isCur && "opacity-40",
                    isToday && "bg-primary/5 border-primary/40",
                  )}
                >
                  <p className={cn("text-xs", isToday && "text-primary font-semibold")}>
                    {d.getDate()}
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {items.slice(0, 2).map((a) => (
                      <div key={a.id} className={cn("text-[9px] truncate rounded px-1 border", TYPE_COLORS[a.type])}>
                        {new Date(a.date).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    ))}
                    {items.length > 2 && <p className="text-[9px] text-muted-foreground">+{items.length - 2}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Reporte */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-1">Reporte</p>
            <h2 className="font-display text-2xl">Próximas citas</h2>
          </div>
        </div>
        <Card className="overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Consumidora</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium">BA</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-left px-4 py-3 font-medium">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible
                  .filter((a) => new Date(a.date) >= addDays(new Date(), -1))
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((a) => {
                    const c = consumers.find((x) => x.id === a.consumerId);
                    const ba = users.find((u) => u.id === a.baId);
                    return (
                      <tr key={a.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatDate(a.date)} ·{" "}
                          <span className="text-muted-foreground">
                            {new Date(a.date).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {c ? (
                            <Link to={`/consumidoras/${c.id}`} className="hover:underline">
                              {fullName(c.firstName, c.lastName)}
                            </Link>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border", TYPE_COLORS[a.type])}>
                            {a.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{ba?.name.split(" ")[0] ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs">{a.status}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{a.notes ?? "—"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <NewAppointmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultDate={defaultDate}
        onCreate={(a) => {
          addAppointment(a);
          toast.success("Cita creada");
          setCreateOpen(false);
        }}
      />
    </div>
  );
}

function Toggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex bg-muted rounded-lg p-0.5">
      {options.map(([v, l]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            "px-3 py-1.5 text-xs uppercase tracking-widest rounded-md transition",
            value === v ? "bg-background shadow-sm font-medium" : "text-muted-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function NewAppointmentDialog({
  open,
  onOpenChange,
  defaultDate,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  defaultDate: Date | null;
  onCreate: (a: Appointment) => void;
}) {
  const user = useCurrentUser()!;
  const [consumer, setConsumer] = useState<Consumer | null>(null);
  const [type, setType] = useState<AppointmentType>("Servicio de Cabina");
  const [date, setDate] = useState(() => (defaultDate ?? new Date()).toISOString().slice(0, 10));
  const [time, setTime] = useState("11:00");
  const [status, setStatus] = useState<AppointmentStatus>("Confirmada");
  const [notes, setNotes] = useState("");

  // sync default
  useMemo(() => {
    if (defaultDate) setDate(defaultDate.toISOString().slice(0, 10));
  }, [defaultDate]);

  const submit = () => {
    if (!consumer) return toast.error("Selecciona una consumidora");
    const dt = new Date(`${date}T${time}:00`);
    onCreate({
      id: `a-${Date.now()}`,
      consumerId: consumer.id,
      baId: user.id,
      storeId: user.storeId,
      date: dt.toISOString(),
      type,
      notes: notes || undefined,
      status,
    });
    setConsumer(null);
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Nueva cita</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Consumidora</Label>
            <ConsumerPicker brand={user.brand} value={consumer} onChange={setConsumer} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 mt-2" />
            </div>
            <div>
              <Label>Hora</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 mt-2" />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Tipo de evento</Label>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border",
                    type === t ? "bg-primary text-primary-foreground border-primary" : "border-border",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Estado</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {(["Confirmada", "Pendiente", "Cancelada", "Reagendada", "Completada", "NoShow"] as AppointmentStatus[]).map(
                (s) => (<option key={s}>{s}</option>),
              )}
            </select>
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={submit}>Crear cita</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// date helpers
function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - r.getDay()); // Sunday start
  return r;
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function formatShort(d: Date) {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}
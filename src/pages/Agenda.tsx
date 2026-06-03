import { useEffect, useMemo, useState } from "react";
import { useApp, useCurrentUser } from "@/store/useApp";
import { PageHeader } from "@/components/clienteling/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConsumerPicker } from "@/components/clienteling/ConsumerPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Download, Plus, MessageCircle, UserCheck, CalendarClock, Trash2, X } from "lucide-react";
import type { Appointment, AppointmentStatus, AppointmentType, Consumer } from "@/lib/types";
import { formatDate, fullName } from "@/lib/format";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
  useAppointmentsList,
  useCreateAppointment,
  useDeleteAppointment,
  useRealtimeInvalidate,
  useUpdateAppointment,
} from "@/lib/db/useAppointments";

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
  const {
    appointments: seedAppointments,
    consumers,
    users,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    addMessage,
    isRealSession,
  } = useApp();

  const dbAppts = useAppointmentsList(
    { brand: user.role === "ba" ? user.brand : "all" },
    isRealSession,
  );
  const createAppt = useCreateAppointment();
  const updateAppt = useUpdateAppointment();
  const deleteAppt = useDeleteAppointment();
  useRealtimeInvalidate("appointments", ["appointments"], isRealSession);
  const appointments = isRealSession ? (dbAppts.data ?? []) : seedAppointments;
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());

  const [view, setView] = useState<"semana" | "mes">("semana");
  const [scope, setScope] = useState<"mias" | "tienda">(user.role === "ba" ? "mias" : "tienda");
  const [anchor, setAnchor] = useState(() => new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);
  const [editing, setEditing] = useState<Appointment | null>(null);

  const openDetails = (a: Appointment) => setEditing(a);

  const handleSaveEdit = async (patch: Partial<Appointment>) => {
    if (!editing) return;
    try {
      if (isRealSession) {
        await updateAppt.mutateAsync({ id: editing.id, patch });
      } else {
        updateAppointment(editing.id, patch);
      }
      toast.success("Cita actualizada");
      setEditing(null);
    } catch (e: any) {
      toast.error("No se pudo actualizar", { description: e?.message ?? String(e) });
    }
  };

  const handleCancelAppt = async () => {
    if (!editing) return;
    try {
      if (isRealSession) {
        await updateAppt.mutateAsync({ id: editing.id, patch: { status: "Cancelada" } });
      } else {
        updateAppointment(editing.id, { status: "Cancelada" });
      }
      toast.success("Cita cancelada");
      setEditing(null);
    } catch (e: any) {
      toast.error("No se pudo cancelar", { description: e?.message ?? String(e) });
    }
  };

  const handleDeleteAppt = async () => {
    if (!editing) return;
    if (!confirm("¿Eliminar esta cita? Esta acción no se puede deshacer.")) return;
    try {
      if (isRealSession) {
        await deleteAppt.mutateAsync(editing.id);
      } else {
        deleteAppointment(editing.id);
      }
      toast.success("Cita eliminada");
      setEditing(null);
    } catch (e: any) {
      toast.error("No se pudo eliminar", { description: e?.message ?? String(e) });
    }
  };

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
        Consumidor: c ? fullName(c.firstName, c.lastName) : "",
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
            <Button asChild variant="outline">
              <Link to="/visitas">
                <UserCheck className="size-4 mr-1.5" /> Registrar visita
              </Link>
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
                          <button
                            key={a.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetails(a);
                            }}
                            className={cn(
                              "text-[10px] rounded px-1.5 py-1 border truncate w-full text-left hover:brightness-95",
                              TYPE_COLORS[a.type],
                            )}
                          >
                            <span className="font-semibold">
                              {new Date(a.date).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                            </span>{" "}
                            {c ? `${c.firstName} ${c.lastName.charAt(0)}.` : ""}
                          </button>
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
                      <button
                        key={a.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetails(a);
                        }}
                        className={cn(
                          "text-[9px] truncate rounded px-1 border w-full text-left hover:brightness-95",
                          TYPE_COLORS[a.type],
                        )}
                      >
                        {new Date(a.date).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </button>
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
                  <th className="text-left px-4 py-3 font-medium">Consumidor</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium">BA</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-left px-4 py-3 font-medium">Notas</th>
                  <th className="text-right px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible
                  .filter((a) => new Date(a.date) >= addDays(new Date(), -1))
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((a) => {
                    const c = consumers.find((x) => x.id === a.consumerId);
                    const ba = users.find((u) => u.id === a.baId);
                    const sent = confirmedIds.has(a.id) || Boolean(a.confirmationSentAt);
                    const confirm = async () => {
                      if (!c) return;
                      const dt = new Date(a.date);
                      const fecha = dt.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
                      const hora = dt.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
                      const brandName = c.brand === "ysl" ? "YSL Beauty" : "Lancôme";
                      const text = `Hola ${c.firstName}, te confirmamos tu cita de ${a.type} el ${fecha} a las ${hora} en ${brandName}. ¿Sigues confirmada? — ${ba?.name.split(" ")[0] ?? ""}`;
                      try {
                        await navigator.clipboard.writeText(text);
                      } catch {/* ignore */}
                      addMessage({
                        id: `m-${Date.now()}`,
                        consumerId: c.id,
                        baId: ba?.id ?? user.id,
                        date: new Date().toISOString(),
                        templateType: `Confirmación cita · ${a.type}`,
                        content: text,
                        channel: "WhatsApp",
                      });
                      setConfirmedIds((s) => new Set(s).add(a.id));
                      toast.success("Confirmación copiada y registrada", {
                        description: "Pega en WhatsApp para enviar.",
                      });
                    };
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
                            <Link to={`/consumidores/${c.id}`} className="hover:underline">
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
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openDetails(a)}
                              className="text-xs h-8"
                            >
                              <CalendarClock className="size-3.5 mr-1" /> Detalles
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={sent ? "ghost" : "outline"}
                              disabled={!c || sent}
                              onClick={confirm}
                              className="text-xs h-8"
                            >
                              <MessageCircle className="size-3.5 mr-1" />
                              {sent ? "Confirmada" : "Confirmar WhatsApp"}
                            </Button>
                          </div>
                        </td>
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
        onCreate={async (a) => {
          try {
            if (isRealSession) {
              await createAppt.mutateAsync(a);
            } else {
              addAppointment(a);
            }
            toast.success("Cita creada");
            setCreateOpen(false);
          } catch (e: any) {
            toast.error("No se pudo crear la cita", { description: e?.message ?? String(e) });
          }
        }}
      />

      <EditAppointmentDialog
        appointment={editing}
        consumers={consumers}
        onOpenChange={(b) => !b && setEditing(null)}
        onSave={handleSaveEdit}
        onCancelAppt={handleCancelAppt}
        onDelete={handleDeleteAppt}
        saving={updateAppt.isPending}
        deleting={deleteAppt.isPending}
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
            <Label className="mb-2 block">Consumidor</Label>
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

function EditAppointmentDialog({
  appointment,
  consumers,
  onOpenChange,
  onSave,
  onCancelAppt,
  onDelete,
  saving,
  deleting,
}: {
  appointment: Appointment | null;
  consumers: Consumer[];
  onOpenChange: (b: boolean) => void;
  onSave: (patch: Partial<Appointment>) => void;
  onCancelAppt: () => void;
  onDelete: () => void;
  saving?: boolean;
  deleting?: boolean;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("11:00");
  const [type, setType] = useState<AppointmentType>("Servicio de Cabina");
  const [status, setStatus] = useState<AppointmentStatus>("Confirmada");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!appointment) return;
    const dt = new Date(appointment.date);
    const pad = (n: number) => n.toString().padStart(2, "0");
    setDate(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`);
    setTime(`${pad(dt.getHours())}:${pad(dt.getMinutes())}`);
    setType(appointment.type);
    setStatus(appointment.status);
    setNotes(appointment.notes ?? "");
  }, [appointment]);

  const open = Boolean(appointment);
  const consumer = appointment ? consumers.find((c) => c.id === appointment.consumerId) : null;

  const submit = () => {
    if (!appointment) return;
    const dt = new Date(`${date}T${time}:00`);
    const newIso = dt.toISOString();
    const rescheduled = newIso !== appointment.date;
    const patch: Partial<Appointment> = {
      date: newIso,
      type,
      notes: notes || undefined,
      status: rescheduled && status === appointment.status ? "Reagendada" : status,
    };
    onSave(patch);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Detalles de la cita</DialogTitle>
        </DialogHeader>
        {appointment && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-3 bg-muted/30">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Consumidor
              </p>
              {consumer ? (
                <Link
                  to={`/consumidores/${consumer.id}`}
                  className="font-medium hover:underline"
                >
                  {fullName(consumer.firstName, consumer.lastName)}
                </Link>
              ) : (
                <p className="font-medium">—</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 mt-2"
                />
              </div>
              <div>
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-11 mt-2"
                />
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
            <div className="flex flex-wrap justify-between gap-2 pt-2 border-t border-border">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancelAppt}
                  disabled={saving || status === "Cancelada"}
                >
                  <X className="size-4 mr-1.5" /> Cancelar cita
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  disabled={deleting}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4 mr-1.5" /> Eliminar
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cerrar
                </Button>
                <Button onClick={submit} disabled={saving}>
                  Guardar cambios
                </Button>
              </div>
            </div>
          </div>
        )}
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
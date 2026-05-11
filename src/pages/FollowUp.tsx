import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApp, useCurrentStore, useCurrentUser } from "@/store/useApp";
import { PageHeader } from "@/components/clienteling/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConsumerPicker } from "@/components/clienteling/ConsumerPicker";
import { ConsumerAvatar } from "@/components/clienteling/Avatar";
import { SegmentBadge } from "@/components/clienteling/SegmentBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Cake,
  Copy,
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import type { Consumer, FollowUp } from "@/lib/types";
import {
  daysBetween,
  daysUntilNextBirthday,
  formatDate,
  fullName,
} from "@/lib/format";
import { TEMPLATES, type TemplateDef, renderTemplate } from "@/lib/templates";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function FollowUpPage() {
  const user = useCurrentUser()!;
  const store = useCurrentStore();
  const { consumers, followUps, users, addFollowUp, addMessage } = useApp();

  const myConsumers = consumers.filter(
    (c) => c.brand === user.brand && (user.role !== "ba" || c.assignedBaId === user.id),
  );

  const birthdays = myConsumers
    .map((c) => ({ c, days: daysUntilNextBirthday(c.birthDate) }))
    .filter(({ days }) => days >= 0 && days <= 7)
    .sort((a, b) => a.days - b.days);

  const replenishment = myConsumers.filter((c) => {
    if (!c.lastTransactionAt) return false;
    const d = daysBetween(c.lastTransactionAt);
    return d >= 30 && d <= 90;
  });

  const inactive = myConsumers.filter(
    (c) => c.lastContactAt && daysBetween(c.lastContactAt) > 60,
  );

  const [recOpen, setRecOpen] = useState(false);
  const [tplState, setTplState] = useState<{
    def: TemplateDef;
    consumer: Consumer;
  } | null>(null);

  const recentLog = useMemo(
    () =>
      followUps
        .filter((f) => (user.role === "ba" ? f.baId === user.id : true))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 12),
    [followUps, user],
  );

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      <PageHeader
        eyebrow="Seguimiento y comunicaciones"
        title="Seguimiento"
        description="Acciones diarias para mantener viva la relación con tus clientas."
        actions={
          <Button onClick={() => setRecOpen(true)}>
            <Plus className="size-4 mr-1.5" /> Registrar seguimiento
          </Button>
        }
      />

      {/* Alerts grid */}
      <section className="grid lg:grid-cols-3 gap-4">
        <AlertColumn
          icon={<Cake className="size-4" />}
          tone="accent"
          title="Cumpleaños esta semana"
          empty="Sin cumpleaños próximos."
          items={birthdays.map(({ c, days }) => ({
            consumer: c,
            sub: days === 0 ? "Hoy 🎂" : `en ${days} día${days === 1 ? "" : "s"}`,
            onAction: () => setTplState({ def: TEMPLATES[0], consumer: c }),
            actionLabel: "Felicitar",
          }))}
        />
        <AlertColumn
          icon={<RefreshCw className="size-4" />}
          tone="primary"
          title="Reposición sugerida"
          empty="Sin reposiciones pendientes."
          items={replenishment.map((c) => ({
            consumer: c,
            sub: `Última compra hace ${daysBetween(c.lastTransactionAt!)} días`,
            onAction: () => setTplState({ def: TEMPLATES[1], consumer: c }),
            actionLabel: "Mensaje",
          }))}
        />
        <AlertColumn
          icon={<AlertTriangle className="size-4" />}
          tone="destructive"
          title="En riesgo (>60d)"
          empty="Cartera al día."
          items={inactive.map((c) => ({
            consumer: c,
            sub: `Sin contacto hace ${daysBetween(c.lastContactAt!)} días`,
            onAction: () => setTplState({ def: TEMPLATES[2], consumer: c }),
            actionLabel: "Reactivar",
          }))}
        />
      </section>

      {/* Templates */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
              Comunicaciones
            </p>
            <h2 className="font-display text-2xl flex items-center gap-2">
              <MessageCircle className="size-5 text-primary" /> Plantillas WhatsApp
            </h2>
          </div>
        </div>
        <Tabs defaultValue="Cumpleaños">
          <TabsList className="bg-muted/50 mb-4">
            {Array.from(new Set(TEMPLATES.map((t) => t.category))).map((cat) => (
              <TabsTrigger key={cat} value={cat}>
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
          {Array.from(new Set(TEMPLATES.map((t) => t.category))).map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-0">
              <div className="grid md:grid-cols-2 gap-4">
                {TEMPLATES.filter((t) => t.category === cat).map((tpl) => (
                  <Card key={tpl.id} className="p-5 shadow-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          {tpl.category}
                        </p>
                        <h3 className="font-display text-lg mt-0.5">{tpl.title}</h3>
                      </div>
                      <Sparkles className="size-4 text-primary/60" />
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-3 mt-3 leading-relaxed">
                      {tpl.body({
                        consumer: { firstName: "[Nombre]" } as Consumer,
                        ba: user,
                        brandName: user.brand === "ysl" ? "YSL Beauty" : "Lancôme",
                        storeName: store?.name ?? "",
                        productName: "[producto]",
                        eventName: "Beauty Night",
                        newProductName: "[lanzamiento]",
                        newProductBenefit: "[beneficio clave]",
                      })}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() => setTplState({ def: tpl, consumer: null as unknown as Consumer })}
                    >
                      <Send className="size-3.5 mr-1.5" /> Personalizar y enviar
                    </Button>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {/* Recent follow-ups */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
              Bitácora
            </p>
            <h2 className="font-display text-2xl">Últimos seguimientos</h2>
          </div>
        </div>
        <Card className="overflow-hidden shadow-card">
          {recentLog.length === 0 ? (
            <p className="p-12 text-center text-sm text-muted-foreground">
              Aún sin seguimientos registrados.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentLog.map((f) => {
                const c = consumers.find((x) => x.id === f.consumerId);
                const ba = users.find((u) => u.id === f.baId);
                if (!c) return null;
                return (
                  <li key={f.id} className="p-4 flex items-center gap-4">
                    <ConsumerAvatar firstName={c.firstName} lastName={c.lastName} size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <Link to={`/consumidoras/${c.id}`} className="font-medium hover:underline">
                          {fullName(c.firstName, c.lastName)}
                        </Link>{" "}
                        <span className="text-muted-foreground">·</span>{" "}
                        <span className="text-xs uppercase tracking-widest text-primary">{f.type}</span>
                      </p>
                      {f.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{f.notes}</p>}
                      {f.nextAction && (
                        <p className="text-[11px] mt-1">
                          <span className="text-muted-foreground">Próximo: </span>
                          {f.nextAction}{f.nextDate && ` · ${formatDate(f.nextDate)}`}
                        </p>
                      )}
                      {f.outcome && (
                        <span
                          className={cn(
                            "inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full",
                            f.outcome === "Convirtió"
                              ? "bg-success/15 text-success"
                              : f.outcome === "Sin interés"
                              ? "bg-destructive/10 text-destructive"
                              : f.outcome === "Necesita revisita"
                              ? "bg-warning/15 text-warning"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {f.outcome}
                        </span>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      <p>{formatDate(f.date)}</p>
                      <p className="opacity-70">{ba?.name.split(" ")[0]}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      <NewFollowUpDialog
        open={recOpen}
        onOpenChange={setRecOpen}
        onSave={(f) => {
          addFollowUp(f);
          toast.success("Seguimiento registrado");
        }}
      />

      {tplState && (
        <TemplateDialog
          state={tplState}
          onClose={() => setTplState(null)}
          onSent={(c, content, type) => {
            addMessage({
              id: `m-${Date.now()}`,
              consumerId: c.id,
              baId: user.id,
              date: new Date().toISOString(),
              templateType: type,
              content,
              channel: "WhatsApp",
            });
          }}
        />
      )}
    </div>
  );
}

function AlertColumn({
  icon,
  tone,
  title,
  empty,
  items,
}: {
  icon: React.ReactNode;
  tone: "accent" | "primary" | "destructive";
  title: string;
  empty: string;
  items: { consumer: Consumer; sub: string; actionLabel: string; onAction: () => void }[];
}) {
  const toneClass = {
    accent: "bg-accent/30 text-accent-foreground border-accent/50",
    primary: "bg-primary/10 text-primary border-primary/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/30",
  }[tone];
  return (
    <Card className="p-5 shadow-card">
      <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium", toneClass)}>
        {icon}
        {title}
        <span className="ml-auto font-display text-base">{items.length}</span>
      </div>
      <div className="mt-3 space-y-1">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">{empty}</p>
        ) : (
          items.slice(0, 6).map(({ consumer, sub, onAction, actionLabel }) => (
            <div key={consumer.id} className="flex items-center gap-2 py-2 border-b border-border/50 last:border-0">
              <ConsumerAvatar firstName={consumer.firstName} lastName={consumer.lastName} size={32} />
              <div className="flex-1 min-w-0">
                <Link to={`/consumidoras/${consumer.id}`} className="text-sm font-medium hover:underline truncate block">
                  {fullName(consumer.firstName, consumer.lastName)}
                </Link>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
              <SegmentBadge segment={consumer.segment} size="sm" />
              <Button size="sm" variant="ghost" onClick={onAction} className="text-xs h-7">
                {actionLabel}
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function NewFollowUpDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onSave: (f: FollowUp) => void;
}) {
  const user = useCurrentUser()!;
  const [consumer, setConsumer] = useState<Consumer | null>(null);
  const [type, setType] = useState<FollowUp["type"]>("3 meses");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [outcome, setOutcome] = useState<NonNullable<FollowUp["outcome"]>>("Pendiente respuesta");
  const [status, setStatus] = useState<NonNullable<FollowUp["status"]>>("completado");

  const submit = () => {
    if (!consumer) return toast.error("Selecciona una consumidora");
    onSave({
      id: `f-${Date.now()}`,
      consumerId: consumer.id,
      baId: user.id,
      date: new Date().toISOString(),
      type,
      notes: notes || undefined,
      nextAction: nextAction || undefined,
      nextDate: nextDate ? new Date(nextDate).toISOString() : undefined,
      outcome,
      status,
    });
    setConsumer(null);
    setNotes("");
    setNextAction("");
    setNextDate("");
    setOutcome("Pendiente respuesta");
    setStatus("completado");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Registrar seguimiento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Consumidora</Label>
            <ConsumerPicker brand={user.brand} value={consumer} onChange={setConsumer} />
          </div>
          <div>
            <Label className="mb-2 block">Tipo</Label>
            <div className="flex flex-wrap gap-1.5">
              {(["3 meses", "6 meses", "Cumpleaños", "Reposición", "Evento especial"] as const).map((t) => (
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
            <Label className="mb-2 block">Resultado de la interacción</Label>
            <div className="flex flex-wrap gap-1.5">
              {(["Convirtió", "Necesita revisita", "Sin interés", "Pendiente respuesta"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcome(o)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border",
                    outcome === o ? "bg-primary text-primary-foreground border-primary" : "border-border",
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 mt-2">
              {(["completado", "pendiente", "omitido"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "text-[11px] uppercase tracking-widest px-2 py-1 rounded-md border",
                    status === s ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Notas / resultado</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Próxima acción</Label>
              <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} className="h-11 mt-2" />
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="h-11 mt-2" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={submit}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TemplateDialog({
  state,
  onClose,
  onSent,
}: {
  state: { def: TemplateDef; consumer: Consumer | null };
  onClose: () => void;
  onSent: (c: Consumer, content: string, type: string) => void;
}) {
  const user = useCurrentUser()!;
  const store = useCurrentStore();
  const [consumer, setConsumer] = useState<Consumer | null>(state.consumer);
  const [productName, setProductName] = useState("");
  const [eventName, setEventName] = useState("Beauty Night");
  const [newProductName, setNewProductName] = useState("");
  const [newProductBenefit, setNewProductBenefit] = useState("");

  const content = useMemo(() => {
    if (!consumer) return "";
    return renderTemplate(state.def, {
      consumer,
      ba: user,
      brand: user.brand,
      storeName: store?.name ?? "",
      productName,
      eventName,
      newProductName,
      newProductBenefit,
    });
  }, [state.def, consumer, user, store, productName, eventName, newProductName, newProductBenefit]);

  const copyAndLog = async () => {
    if (!consumer) return toast.error("Selecciona una consumidora");
    await navigator.clipboard.writeText(content);
    onSent(consumer, content, state.def.title);
    toast.success("Copiado al portapapeles", {
      description: "Pega en WhatsApp para enviarlo.",
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{state.def.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Consumidora</Label>
            <ConsumerPicker brand={user.brand} value={consumer} onChange={setConsumer} />
          </div>

          {state.def.category === "Reposición" && (
            <div>
              <Label>Producto</Label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} className="h-11 mt-2" placeholder="Advanced Génifique 50ml" />
            </div>
          )}
          {state.def.category === "Evento VIP" && (
            <div>
              <Label>Nombre del evento</Label>
              <Input value={eventName} onChange={(e) => setEventName(e.target.value)} className="h-11 mt-2" />
            </div>
          )}
          {state.def.category === "Lanzamiento" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Producto nuevo</Label>
                <Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="h-11 mt-2" />
              </div>
              <div>
                <Label>Beneficio clave</Label>
                <Input value={newProductBenefit} onChange={(e) => setNewProductBenefit(e.target.value)} className="h-11 mt-2" />
              </div>
            </div>
          )}

          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm whitespace-pre-line max-h-64 overflow-y-auto leading-relaxed">
            {content || "Selecciona una consumidora para previsualizar."}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={copyAndLog} disabled={!consumer}>
              <Copy className="size-4 mr-1.5" /> Copiar para WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { Link, Navigate, useParams } from "react-router-dom";
import { useApp } from "@/store/useApp";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConsumerAvatar } from "@/components/clienteling/Avatar";
import { SegmentBadge } from "@/components/clienteling/SegmentBadge";
import {
  daysBetween,
  daysUntilNextBirthday,
  formatDate,
  formatDateTime,
  formatMoney,
  formatPhoneMx,
  fullName,
} from "@/lib/format";
import {
  AlertTriangle,
  ArrowLeft,
  Cake,
  Calendar,
  CheckCircle2,
  Download,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PrivacyConsent } from "@/lib/types";

export default function ConsumerProfile() {
  const { id } = useParams();
  const {
    consumers,
    purchases,
    appointments,
    recommendations,
    samples,
    followUps,
    messages,
    users,
    stores,
  } = useApp();
  const c = consumers.find((x) => x.id === id);
  if (!c) return <Navigate to="/consumidoras" replace />;

  const myPurchases = purchases.filter((p) => p.consumerId === c.id);
  const myAppts = appointments.filter((a) => a.consumerId === c.id);
  const myRecs = recommendations.filter((r) => r.consumerId === c.id);
  const mySamples = samples.filter((s) => s.consumerId === c.id);
  const myFollowUps = followUps.filter((f) => f.consumerId === c.id);
  const myMessages = messages.filter((m) => m.consumerId === c.id);

  const total = myPurchases.reduce((s, p) => s + p.total, 0);
  const ba = users.find((u) => u.id === c.assignedBaId);
  const signed = Boolean(c.privacy.signaturePng);

  const birthdayDays = daysUntilNextBirthday(c.birthDate);
  const inactiveDays = c.lastContactAt ? daysBetween(c.lastContactAt) : null;
  const replenish = c.lastTransactionAt && daysBetween(c.lastTransactionAt) >= 30 && daysBetween(c.lastTransactionAt) <= 90;
  const anniversary = (() => {
    const d = new Date(c.createdAt);
    const next = new Date(new Date().getFullYear(), d.getMonth(), d.getDate());
    if (next < new Date()) next.setFullYear(next.getFullYear() + 1);
    const days = Math.ceil((next.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const years = next.getFullYear() - d.getFullYear();
    return days <= 14 && years > 0 ? { days, years } : null;
  })();

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/consumidoras">
            <ArrowLeft className="size-4 mr-1" /> Consumidoras
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/compras?consumerId=${c.id}`}>
              <ShoppingBag className="size-4 mr-1.5" /> Registrar compra
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/recomendaciones?consumerId=${c.id}`}>
              <Sparkles className="size-4 mr-1.5" /> Recomendar
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/agenda">
              <Calendar className="size-4 mr-1.5" /> Agendar
            </Link>
          </Button>
        </div>
      </div>

      {/* Lifecycle alerts */}
      <div className="space-y-2">
        {birthdayDays >= 0 && birthdayDays <= 7 && (
          <AlertBanner
            tone="accent"
            icon={<Cake className="size-4" />}
            text={
              birthdayDays === 0
                ? "🎂 ¡Su cumpleaños es hoy! Considera enviar un mensaje y un detalle."
                : `🎂 Cumpleaños en ${birthdayDays} día${birthdayDays === 1 ? "" : "s"}.`
            }
          />
        )}
        {anniversary && (
          <AlertBanner
            tone="primary"
            icon={<Star className="size-4" />}
            text={`📅 ${anniversary.years} año${anniversary.years > 1 ? "s" : ""} como clienta en ${anniversary.days} día${anniversary.days === 1 ? "" : "s"}.`}
          />
        )}
        {replenish && (
          <AlertBanner
            tone="primary"
            icon={<RefreshCw className="size-4" />}
            text="🔁 Probable reposición de producto — han pasado 30–90 días desde su última compra."
          />
        )}
        {inactiveDays !== null && inactiveDays > 60 && (
          <AlertBanner
            tone="destructive"
            icon={<AlertTriangle className="size-4" />}
            text={`⚠️ En riesgo: sin contacto hace ${inactiveDays} días.`}
          />
        )}
        {!signed && (
          <AlertBanner
            tone="warning"
            icon={<AlertTriangle className="size-4" />}
            text="⚠️ Esta clienta no tiene firma digital del aviso de privacidad. Solicita su firma en la próxima visita."
          />
        )}
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="space-y-4">
          <Card className="p-6 shadow-card text-center">
            <ConsumerAvatar
              firstName={c.firstName}
              lastName={c.lastName}
              size={88}
              className="mx-auto"
            />
            <h1 className="font-display text-2xl mt-4 leading-tight">
              {fullName(c.firstName, c.lastName)}
            </h1>
            <div className="mt-2 flex justify-center">
              <SegmentBadge segment={c.segment} />
            </div>

            <div className="hairline my-5" />

            <div className="space-y-2 text-left">
              <InfoLine icon={<Phone className="size-3.5" />} value={formatPhoneMx(c.phone)} />
              <InfoLine icon={<Mail className="size-3.5" />} value={c.email} truncate />
              <InfoLine icon={<Cake className="size-3.5" />} value={formatDate(c.birthDate)} />
              <InfoLine icon={<Shield className="size-3.5" />} value={signed ? `Firmado ${c.privacy.version}` : `Privacidad ${c.privacy.version}`} />
            </div>

            <div className="hairline my-5" />

            <div className="grid grid-cols-2 gap-3 text-center">
              <Stat label="Compras" value={myPurchases.length} />
              <Stat label="Total" value={formatMoney(total)} small />
              <Stat label="Citas" value={myAppts.length} />
              <Stat label="Reco." value={myRecs.length} />
            </div>

            <div className="hairline my-5" />

            <p className="text-xs text-muted-foreground">BA asignada</p>
            <p className="text-sm font-medium">{ba?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-3">Clienta desde</p>
            <p className="text-sm">{formatDate(c.createdAt)}</p>
          </Card>

          <Card className="p-4 shadow-card space-y-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Canales autorizados
            </p>
            <ConsentRow label="WhatsApp" on={c.consentWhatsApp} />
            <ConsentRow label="SMS" on={c.consentSMS} />
            <ConsentRow label="Email" on={c.consentEmail} />
          </Card>
        </aside>

        {/* Tabs */}
        <Card className="shadow-card">
          <Tabs defaultValue="resumen" className="w-full">
            <div className="border-b border-border px-2 overflow-x-auto">
              <TabsList className="h-auto bg-transparent p-0 gap-1">
                {[
                  ["resumen", "Resumen"],
                  ["intereses", "Intereses & Piel"],
                  ["compras", "Compras"],
                  ["recomendaciones", "Recomendaciones"],
                  ["muestras", "Muestras"],
                  ["citas", "Citas"],
                  ["comunicaciones", "Comunicaciones"],
                  ["seguimiento", "Seguimiento"],
                ].map(([v, l]) => (
                  <TabsTrigger
                    key={v}
                    value={v}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
                  >
                    {l}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="p-6 lg:p-8">
              <TabsContent value="resumen" className="mt-0 space-y-6">
                <div className="grid sm:grid-cols-3 gap-3">
                  <SummaryCard label="Última compra" value={formatDate(c.lastTransactionAt)} />
                  <SummaryCard label="Total acumulado" value={formatMoney(total)} />
                  <SummaryCard label="Último contacto" value={formatDate(c.lastContactAt)} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                    Motivo de visita más frecuente
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {c.notes ?? "Sin notas registradas."}
                  </p>
                </div>
                <PrivacySignatureCard consumerName={fullName(c.firstName, c.lastName)} privacy={c.privacy} baName={ba?.name ?? "—"} storeName={c.privacy.signedAtStoreName ?? stores.find((s) => s.id === c.storeId)?.name ?? "—"} />
              </TabsContent>

              <TabsContent value="intereses" className="mt-0 space-y-6">
                <Section title="Categorías de interés">
                  <ChipRow items={c.interests} empty="Sin categorías registradas." />
                </Section>
                <div className="grid sm:grid-cols-2 gap-6">
                  <Section title="Tipo de piel">
                    <p className="text-base">{c.skinType ?? "—"}</p>
                  </Section>
                  <Section title="Rutina">
                    <p className="text-base">{c.routine ?? "—"}</p>
                  </Section>
                  <Section title="Tono / Subtono">
                    <p className="text-base">
                      {c.skinTone ?? "—"} {c.subTone && <span className="text-muted-foreground">· {c.subTone}</span>}
                    </p>
                  </Section>
                  <Section title="Shades guardados">
                    <p className="text-sm text-muted-foreground">
                      Base: {c.shades?.foundation ?? "—"} · Labial: {c.shades?.lipstick ?? "—"}
                    </p>
                  </Section>
                </div>
                <Section title="Preocupaciones de piel">
                  <ChipRow items={c.skinConcerns} empty="—" />
                </Section>
                <div className="grid sm:grid-cols-2 gap-6">
                  <Section title="Ingredientes preferidos">
                    <ChipRow items={c.preferredIngredients} empty="—" />
                  </Section>
                  <Section title="Ingredientes a evitar">
                    <ChipRow items={c.avoidIngredients} empty="—" tone="destructive" />
                  </Section>
                </div>
              </TabsContent>

              <TabsContent value="compras" className="mt-0">
                {myPurchases.length === 0 ? (
                  <EmptyTab text="Sin compras registradas todavía." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border">
                        <tr>
                          <th className="text-left py-2.5 font-medium">Fecha</th>
                          <th className="text-left py-2.5 font-medium">Producto</th>
                          <th className="text-left py-2.5 font-medium">SKU</th>
                          <th className="text-right py-2.5 font-medium">Cant.</th>
                          <th className="text-right py-2.5 font-medium">Precio</th>
                          <th className="text-left py-2.5 font-medium">BA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {myPurchases.flatMap((p) =>
                          p.lines.map((l, i) => (
                            <tr key={p.id + i}>
                              <td className="py-3">{formatDate(p.date)}</td>
                              <td className="py-3">{l.name}</td>
                              <td className="py-3 text-muted-foreground">{l.sku}</td>
                              <td className="py-3 text-right">{l.qty}</td>
                              <td className="py-3 text-right">{formatMoney(l.price * l.qty)}</td>
                              <td className="py-3 text-muted-foreground">
                                {users.find((u) => u.id === p.baId)?.name.split(" ")[0]}
                              </td>
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recomendaciones" className="mt-0">
                {myRecs.length === 0 ? (
                  <EmptyTab text="Sin recomendaciones todavía." />
                ) : (
                  <ul className="divide-y divide-border">
                    {myRecs.map((r) => (
                      <li key={r.id} className="py-3 flex justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">
                            {r.products.map((p) => p.name).join(" · ")}
                          </p>
                          {r.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5">{r.notes}</p>
                          )}
                        </div>
                        <div className="text-right text-xs text-muted-foreground shrink-0">
                          <p>{formatDate(r.date)}</p>
                          <span
                            className={cn(
                              "inline-block mt-1 px-2 py-0.5 rounded-full",
                              r.converted
                                ? "bg-success/15 text-success"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {r.converted ? "Convirtió" : "Pendiente"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="muestras" className="mt-0">
                {mySamples.length === 0 ? (
                  <EmptyTab text="Sin muestras entregadas." />
                ) : (
                  <ul className="divide-y divide-border">
                    {mySamples.map((s) => (
                      <li key={s.id} className="py-3 flex justify-between text-sm">
                        <div>
                          <p className="font-medium">{s.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            Entregada {formatDate(s.date)} · Seguimiento {formatDate(s.followUpDate)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "self-center text-xs px-2 py-0.5 rounded-full",
                            s.converted ? "bg-success/15 text-success" : "bg-muted",
                          )}
                        >
                          {s.converted ? "Convirtió" : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="citas" className="mt-0">
                {myAppts.length === 0 ? (
                  <EmptyTab text="Sin citas registradas." />
                ) : (
                  <ul className="divide-y divide-border">
                    {myAppts
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((a) => (
                        <li key={a.id} className="py-3 flex justify-between text-sm">
                          <div>
                            <p className="font-medium">{a.type}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(a.date)} · {a.notes ?? "Sin notas"}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted self-center">
                            {a.status}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="comunicaciones" className="mt-0">
                {myMessages.length === 0 ? (
                  <EmptyTab
                    text="Aún no se han enviado mensajes."
                    icon={<MessageCircle className="size-5" />}
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {myMessages.map((m) => (
                      <li key={m.id} className="py-3">
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(m.date)} · {m.channel} · {m.templateType}
                        </p>
                        <p className="text-sm mt-1 whitespace-pre-line">{m.content}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="seguimiento" className="mt-0">
                {myFollowUps.length === 0 ? (
                  <EmptyTab text="Sin seguimientos registrados." />
                ) : (
                  <ul className="divide-y divide-border">
                    {myFollowUps.map((f) => (
                      <li key={f.id} className="py-3">
                        <div className="flex justify-between text-sm">
                          <p className="font-medium">{f.type}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(f.date)}</p>
                        </div>
                        {f.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{f.notes}</p>
                        )}
                        {f.nextAction && (
                          <p className="text-xs mt-1">
                            <span className="text-muted-foreground">Próximo: </span>
                            {f.nextAction} {f.nextDate && `· ${formatDate(f.nextDate)}`}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <Button size="sm" variant="outline" className="mt-4">
                  <Plus className="size-3.5 mr-1" /> Registrar seguimiento
                </Button>
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function AlertBanner({
  tone,
  icon,
  text,
}: {
  tone: "accent" | "primary" | "warning" | "destructive";
  icon: React.ReactNode;
  text: string;
}) {
  const cls = {
    accent: "bg-accent/30 border-accent/50 text-accent-foreground",
    primary: "bg-primary/10 border-primary/30 text-primary",
    warning: "bg-warning/15 border-warning/35 text-warning",
    destructive: "bg-destructive/10 border-destructive/30 text-destructive",
  }[tone];
  return (
    <div className={cn("flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm", cls)}>
      {icon}
      <span>{text}</span>
    </div>
  );
}

function InfoLine({
  icon,
  value,
  truncate,
}: {
  icon: React.ReactNode;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="text-primary/70">{icon}</span>
      <span className={cn("text-foreground", truncate && "truncate")}>{value}</span>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("font-display mt-0.5", small ? "text-base" : "text-2xl")}>{value}</p>
    </div>
  );
}

function ConsentRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <span
        className={cn(
          "text-xs px-2 py-0.5 rounded-full",
          on ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
        )}
      >
        {on ? "Autorizado" : "No"}
      </span>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-xl mt-1">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{title}</p>
      {children}
    </div>
  );
}

function ChipRow({
  items,
  empty,
  tone = "default",
}: {
  items: string[];
  empty: string;
  tone?: "default" | "destructive";
}) {
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span
          key={it}
          className={cn(
            "text-xs px-2.5 py-1 rounded-full border",
            tone === "destructive"
              ? "bg-destructive/10 text-destructive border-destructive/30"
              : "bg-secondary text-secondary-foreground border-transparent",
          )}
        >
          {it}
        </span>
      ))}
    </div>
  );
}

function EmptyTab({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
        {icon ?? <ShoppingBag className="size-5" />}
      </div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
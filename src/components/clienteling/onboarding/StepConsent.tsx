import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Shield, MessageSquare, Mail, Phone, Eraser, PenLine } from "lucide-react";
import {
  PRIVACY_TEXT,
  PRIVACY_VERSION,
  type ErrorMap,
  type OnboardingDraft,
} from "@/lib/onboarding";
import { formatPhoneMx } from "@/lib/format";
import { ageBracket, ageFromIso } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

interface Props {
  draft: OnboardingDraft;
  errors: ErrorMap;
  update: <K extends keyof OnboardingDraft>(k: K, v: OnboardingDraft[K]) => void;
  assignedBaName: string;
}

export function StepConsent({ draft, errors, update, assignedBaName }: Props) {
  const age = ageFromIso(draft.birthDate);
  const phonePretty =
    draft.phone.replace(/\D/g, "").length === 10 ? formatPhoneMx(draft.phone) : draft.phone;

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-3 p-6 lg:p-8 shadow-card space-y-5">
        <header className="flex items-start gap-3">
          <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Shield className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-xl">Aviso de privacidad (LFPDPPP)</h2>
            <p className="text-sm text-muted-foreground">
              Lee el aviso completo a la clienta y solicita su aceptación en el iPad.
            </p>
          </div>
        </header>

        <details className="rounded-lg border border-border bg-muted/20 open:bg-muted/30 transition" open>
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
            Texto completo del aviso · {PRIVACY_VERSION}
          </summary>
          <ScrollArea className="h-56 border-t border-border p-4">
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {PRIVACY_TEXT}
            </p>
          </ScrollArea>
        </details>

        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-border p-3 hover:border-primary/40 transition">
            <Checkbox
              checked={draft.privacy}
              onCheckedChange={(v) => update("privacy", Boolean(v))}
              className="mt-0.5"
            />
            <span className="text-sm">
              He leído y acepto el <b>Aviso de Privacidad</b> ({PRIVACY_VERSION}).
            </span>
          </label>
          {errors.privacy && <p className="text-xs text-destructive">{errors.privacy}</p>}

          <div className="grid sm:grid-cols-3 gap-2">
            <ConsentBox icon={<Phone className="size-4" />} label="WhatsApp" value={draft.consentWhatsApp} onChange={(v) => update("consentWhatsApp", v)} />
            <ConsentBox icon={<Mail className="size-4" />} label="Correo electrónico" value={draft.consentEmail} onChange={(v) => update("consentEmail", v)} />
            <ConsentBox icon={<MessageSquare className="size-4" />} label="SMS" value={draft.consentSMS} onChange={(v) => update("consentSMS", v)} />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium flex items-center gap-2">
                <PenLine className="size-4 text-primary" /> Firma digital de clienta
              </p>
              <p className="text-xs text-muted-foreground">
                Firme con su dedo en el recuadro para confirmar su aceptación.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => update("signaturePng", "")}
              disabled={!draft.signaturePng}
            >
              <Eraser className="size-3.5 mr-1" /> Limpiar firma
            </Button>
          </div>
          <SignaturePad
            disabled={!draft.privacy}
            value={draft.signaturePng}
            onChange={(png) => update("signaturePng", png)}
          />
          {!draft.privacy && (
            <p className="text-xs text-warning">Activa la aceptación del aviso para habilitar la firma.</p>
          )}
          {errors.signaturePng && <p className="text-xs text-destructive">{errors.signaturePng}</p>}
        </div>
      </Card>

      <Card className="lg:col-span-2 p-6 shadow-card space-y-4 h-fit sticky top-4">
        <header>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Resumen</p>
          <h3 className="font-display text-lg">{draft.firstName || "—"} {draft.lastName}</h3>
        </header>

        <SummaryRow label="Género" value={draft.gender} />
        <SummaryRow label="Edad" value={age != null ? `${age} años (${ageBracket(age)})` : "—"} />
        <SummaryRow label="Celular" value={phonePretty || "—"} />
        <SummaryRow label="Correo" value={draft.email || "—"} />
        <Separator />
        <SummaryRow label="Intereses" value={draft.interests.length ? draft.interests.join(", ") : "—"} />
        <SummaryRow label="Rutina" value={draft.routine || "—"} />
        <SummaryRow label="Tipo de piel" value={draft.skinType || "—"} />
        <SummaryRow label="Tono" value={[draft.skinTone, draft.subTone].filter(Boolean).join(" · ") || "—"} />
        <SummaryRow label="Preocupaciones" value={draft.skinConcerns.length ? draft.skinConcerns.join(", ") : "—"} />
        <Separator />
        <SummaryRow label="BA asignada" value={assignedBaName} />
        <SummaryRow label="Firma" value={draft.signaturePng ? "Capturada" : "Pendiente"} />
        <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
          Al guardar se registrará timestamp, versión del aviso, BA, tienda y dispositivo iPad.
        </div>
      </Card>
    </div>
  );
}

function SignaturePad({ disabled, value, onChange }: { disabled: boolean; value: string; onChange: (png: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(Boolean(value));

  const paintBase = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.floor(220 * ratio);
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, 220);
    ctx.strokeStyle = "#d6d3cc";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(28, 155);
    ctx.lineTo(rect.width - 28, 155);
    ctx.stroke();
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#8b8178";
    ctx.fillText("Firma de la clienta", 28, 178);
  };

  useEffect(() => {
    paintBase();
  }, []);

  useEffect(() => {
    if (!value) {
      paintBase();
      setHasInk(false);
    }
  }, [value]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    drawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = e.currentTarget.getContext("2d")!;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = point(e);
    ctx.strokeStyle = "#17120f";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasInk(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas && hasInk) onChange(canvas.toDataURL("image/png"));
  };

  return (
    <div className={cn("rounded-xl p-3 shadow-card border", "bg-brand-cream border-border", "data-[brand=ysl]:bg-card data-[brand=ysl]:border-gold/60")}>
      <canvas
        ref={canvasRef}
        className={cn(
          "w-full h-[220px] rounded-lg bg-card touch-none border border-border shadow-sm",
          disabled && "opacity-60 cursor-not-allowed",
        )}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground text-xs uppercase tracking-wider shrink-0">{label}</span>
      <span className="text-right truncate">{value}</span>
    </div>
  );
}

function ConsentBox({ icon, label, value, onChange }: { icon: React.ReactNode; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={cn("flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition", value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
      <Checkbox checked={value} onCheckedChange={(v) => onChange(Boolean(v))} />
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm">{label}</span>
    </label>
  );
}

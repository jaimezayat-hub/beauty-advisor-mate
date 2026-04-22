import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Shield, MessageSquare, Mail, Phone } from "lucide-react";
import {
  PRIVACY_TEXT,
  PRIVACY_VERSION,
  type ErrorMap,
  type OnboardingDraft,
} from "@/lib/onboarding";
import { formatPhoneMx } from "@/lib/format";
import { ageBracket, ageFromIso } from "@/lib/onboarding";

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
              Lee el aviso completo a la clienta y solicita el consentimiento explícito
              antes de guardar.
            </p>
          </div>
        </header>

        <ScrollArea className="h-56 rounded-md border border-border p-4 bg-muted/30">
          <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
            {PRIVACY_TEXT}
          </p>
        </ScrollArea>

        <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-border p-3 hover:border-primary/40 transition">
          <Checkbox
            checked={draft.privacy}
            onCheckedChange={(v) => update("privacy", Boolean(v))}
            className="mt-0.5"
          />
          <span className="text-sm">
            La clienta declara haber leído y aceptado el{" "}
            <b>Aviso de Privacidad</b> ({PRIVACY_VERSION}). Se registrará la fecha y
            hora exactas de aceptación.
          </span>
        </label>
        {errors.privacy && (
          <p className="text-xs text-destructive">{errors.privacy}</p>
        )}

        <Separator />

        <div>
          <p className="text-sm font-medium mb-1">
            Consentimiento de marketing (opcional, por canal)
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            La clienta puede autorizar comunicaciones por uno o varios canales.
          </p>
          <div className="grid sm:grid-cols-3 gap-2">
            <ConsentBox
              icon={<MessageSquare className="size-4" />}
              label="SMS"
              value={draft.consentSMS}
              onChange={(v) => update("consentSMS", v)}
            />
            <ConsentBox
              icon={<Mail className="size-4" />}
              label="Correo electrónico"
              value={draft.consentEmail}
              onChange={(v) => update("consentEmail", v)}
            />
            <ConsentBox
              icon={<Phone className="size-4" />}
              label="WhatsApp"
              value={draft.consentWhatsApp}
              onChange={(v) => update("consentWhatsApp", v)}
            />
          </div>
        </div>
      </Card>

      <Card className="lg:col-span-2 p-6 shadow-card space-y-4 h-fit sticky top-4">
        <header>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Resumen
          </p>
          <h3 className="font-display text-lg">
            {draft.firstName || "—"} {draft.lastName}
          </h3>
        </header>

        <SummaryRow label="Género" value={draft.gender} />
        <SummaryRow
          label="Edad"
          value={age != null ? `${age} años (${ageBracket(age)})` : "—"}
        />
        <SummaryRow label="Celular" value={phonePretty || "—"} />
        <SummaryRow label="Correo" value={draft.email || "—"} />

        <Separator />

        <SummaryRow
          label="Intereses"
          value={draft.interests.length ? draft.interests.join(", ") : "—"}
        />
        <SummaryRow label="Rutina" value={draft.routine || "—"} />
        <SummaryRow label="Tipo de piel" value={draft.skinType || "—"} />
        <SummaryRow
          label="Tono"
          value={
            [draft.skinTone, draft.subTone].filter(Boolean).join(" · ") || "—"
          }
        />
        <SummaryRow
          label="Preocupaciones"
          value={draft.skinConcerns.length ? draft.skinConcerns.join(", ") : "—"}
        />

        <Separator />

        <SummaryRow label="BA asignada" value={assignedBaName} />
        <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
          Al guardar, la clienta se etiquetará como{" "}
          <span className="font-medium text-foreground">Nueva</span> y aparecerá en
          tu cartera.
        </div>
      </Card>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground text-xs uppercase tracking-wider shrink-0">
        {label}
      </span>
      <span className="text-right truncate">{value}</span>
    </div>
  );
}

function ConsentBox({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={
        "flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition " +
        (value
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40")
      }
    >
      <Checkbox checked={value} onCheckedChange={(v) => onChange(Boolean(v))} />
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm">{label}</span>
    </label>
  );
}
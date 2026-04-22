import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, useCurrentUser } from "@/store/useApp";
import { PageHeader } from "@/components/clienteling/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { Consumer, Gender } from "@/lib/types";
import { Shield } from "lucide-react";

const PRIVACY_VERSION = "v1.2 — abr 2026";
const PRIVACY_TEXT = `Aviso de Privacidad — L'Oréal México S.A. de C.V.

En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), L'Oréal México S.A. de C.V., con domicilio en Av. Ejército Nacional, CDMX, es responsable del tratamiento de tus datos personales.

Datos recabados: nombre, fecha de nacimiento, género, correo electrónico, teléfono celular, preferencias de belleza, historial de compras y de servicios en counter.

Finalidades primarias: prestación de servicios de Beauty Advisor, gestión de tu perfil de clienta, registro de transacciones, recomendaciones personalizadas y agendamiento de citas en cabina.

Finalidades secundarias (requieren consentimiento explícito): envío de comunicaciones promocionales por SMS, correo electrónico y/o WhatsApp; invitaciones a eventos exclusivos; programas de lealtad.

Derechos ARCO: puedes ejercer tus derechos de Acceso, Rectificación, Cancelación u Oposición escribiendo a privacidad@loreal.mx.

Versión: ${PRIVACY_VERSION}.`;

export default function NewConsumer() {
  const user = useCurrentUser()!;
  const navigate = useNavigate();
  const addConsumer = useApp((s) => s.addConsumer);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    gender: "Femenino" as Gender,
    birthDate: "",
    phone: "",
    email: "",
    privacy: false,
    consentSMS: false,
    consentEmail: false,
    consentWhatsApp: false,
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Real-time validation
  const errors = {
    firstName: form.firstName.trim().length < 2 ? "Requerido" : "",
    lastName: form.lastName.trim().length < 2 ? "Requerido" : "",
    birthDate: !form.birthDate ? "Requerido" : "",
    phone:
      form.phone.replace(/\D/g, "").length < 10
        ? "Celular debe tener 10 dígitos"
        : "",
    email: !/^\S+@\S+\.\S+$/.test(form.email) ? "Correo inválido" : "",
    privacy: !form.privacy ? "Debes aceptar el aviso de privacidad" : "",
  };
  const valid = Object.values(errors).every((e) => !e);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      toast.error("Revisa los campos requeridos");
      return;
    }
    const now = new Date().toISOString();
    const c: Consumer = {
      id: `c-${Date.now()}`,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      gender: form.gender,
      birthDate: form.birthDate,
      phone: form.phone.replace(/\D/g, ""),
      email: form.email.trim().toLowerCase(),
      privacy: { accepted: true, acceptedAt: now, version: PRIVACY_VERSION },
      consentSMS: form.consentSMS,
      consentEmail: form.consentEmail,
      consentWhatsApp: form.consentWhatsApp,
      skinConcerns: [],
      interests: [],
      preferredIngredients: [],
      avoidIngredients: [],
      segment: "Nueva",
      assignedBaId: user.id,
      storeId: user.storeId,
      brand: user.brand,
      createdAt: now,
      lastContactAt: now,
    };
    addConsumer(c);
    toast.success("Perfil guardado correctamente");
    navigate(`/consumidoras/${c.id}`);
  };

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-8">
      <PageHeader
        eyebrow="Alta de clienta"
        title="Nueva consumidora"
        description="Captura los datos esenciales y el consentimiento de privacidad."
      />

      <form onSubmit={submit} className="space-y-6">
        <Card className="p-6 lg:p-8 shadow-card space-y-6">
          <div>
            <h2 className="font-display text-xl mb-1">Datos personales</h2>
            <p className="text-sm text-muted-foreground">
              Todos los campos son obligatorios.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nombre(s)" error={form.firstName && errors.firstName}>
              <Input
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                className="h-11"
              />
            </Field>
            <Field label="Apellidos" error={form.lastName && errors.lastName}>
              <Input
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                className="h-11"
              />
            </Field>
            <Field label="Género">
              <select
                value={form.gender}
                onChange={(e) => update("gender", e.target.value as Gender)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option>Femenino</option>
                <option>Masculino</option>
                <option>Prefiero no decir</option>
              </select>
            </Field>
            <Field
              label="Fecha de nacimiento"
              error={form.birthDate ? errors.birthDate : ""}
            >
              <Input
                type="date"
                value={form.birthDate}
                onChange={(e) => update("birthDate", e.target.value)}
                className="h-11"
              />
            </Field>
            <Field label="Celular (+52)" error={form.phone && errors.phone}>
              <Input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="55 1234 5678"
                inputMode="numeric"
                className="h-11"
              />
            </Field>
            <Field label="Correo electrónico" error={form.email && errors.email}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="h-11"
              />
            </Field>
          </div>
        </Card>

        <Card className="p-6 lg:p-8 shadow-card space-y-5">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Shield className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-xl">Aviso de privacidad (LFPDPPP)</h2>
              <p className="text-sm text-muted-foreground">
                Lee el aviso completo y solicita el consentimiento explícito.
              </p>
            </div>
          </div>

          <ScrollArea className="h-48 rounded-md border border-border p-4 bg-muted/30">
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {PRIVACY_TEXT}
            </p>
          </ScrollArea>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={form.privacy}
              onCheckedChange={(v) => update("privacy", Boolean(v))}
              className="mt-0.5"
            />
            <span className="text-sm">
              He leído y acepto el <b>Aviso de Privacidad</b> ({PRIVACY_VERSION}). Se
              registrará la fecha y hora exactas de aceptación.
            </span>
          </label>

          <div className="hairline" />

          <div>
            <p className="text-sm font-medium mb-3">
              Consentimiento de marketing (opcional, por canal)
            </p>
            <div className="grid sm:grid-cols-3 gap-2">
              <ConsentBox
                label="SMS"
                value={form.consentSMS}
                onChange={(v) => update("consentSMS", v)}
              />
              <ConsentBox
                label="Correo electrónico"
                value={form.consentEmail}
                onChange={(v) => update("consentEmail", v)}
              />
              <ConsentBox
                label="WhatsApp"
                value={form.consentWhatsApp}
                onChange={(v) => update("consentWhatsApp", v)}
              />
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" size="lg" disabled={!valid}>
            Guardar consumidora
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | false;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

function ConsentBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/40 transition">
      <Checkbox checked={value} onCheckedChange={(v) => onChange(Boolean(v))} />
      <span className="text-sm">{label}</span>
    </label>
  );
}
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "./FormField";
import {
  ageBracket,
  ageFromIso,
  type ErrorMap,
  type OnboardingDraft,
} from "@/lib/onboarding";
import { formatPhoneMx } from "@/lib/format";
import type { Gender } from "@/lib/types";
import { User } from "lucide-react";

interface Props {
  draft: OnboardingDraft;
  errors: ErrorMap;
  update: <K extends keyof OnboardingDraft>(k: K, v: OnboardingDraft[K]) => void;
}

const GENDERS: Gender[] = ["Femenino", "Masculino", "Prefiero no decir"];

export function StepIdentity({ draft, errors, update }: Props) {
  const age = ageFromIso(draft.birthDate);
  const phonePreview =
    draft.phone.replace(/\D/g, "").length === 10 ? formatPhoneMx(draft.phone) : null;

  return (
    <Card className="p-6 lg:p-8 shadow-card space-y-6">
      <header className="flex items-start gap-3">
        <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <User className="size-5" />
        </div>
        <div>
          <h2 className="font-display text-xl">Datos personales</h2>
          <p className="text-sm text-muted-foreground">
            Información básica para identificar y contactar a la clienta.
          </p>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        <FormField
          label="Nombre(s)"
          required
          error={draft.firstName ? errors.firstName : ""}
        >
          <Input
            value={draft.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            placeholder="Sofía"
            className="h-11"
            maxLength={60}
          />
        </FormField>

        <FormField
          label="Apellidos"
          required
          error={draft.lastName ? errors.lastName : ""}
        >
          <Input
            value={draft.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            placeholder="Mendoza"
            className="h-11"
            maxLength={60}
          />
        </FormField>

        <FormField label="Género" required>
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((g) => {
              const active = draft.gender === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => update("gender", g)}
                  className={
                    "px-3.5 py-2 rounded-full text-sm border transition " +
                    (active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/40")
                  }
                >
                  {g}
                </button>
              );
            })}
          </div>
        </FormField>

        <FormField
          label="Fecha de nacimiento"
          required
          hint={age != null ? `${age} años · rango ${ageBracket(age)}` : "DD/MM/AAAA"}
          error={draft.birthDate ? errors.birthDate : ""}
        >
          <Input
            type="date"
            value={draft.birthDate}
            onChange={(e) => update("birthDate", e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="h-11"
          />
        </FormField>

        <FormField
          label="Celular (+52)"
          required
          hint={phonePreview ?? "10 dígitos sin espacios"}
          error={draft.phone ? errors.phone : ""}
        >
          <Input
            value={draft.phone}
            onChange={(e) => update("phone", e.target.value.replace(/[^\d\s()-]/g, ""))}
            placeholder="55 1234 5678"
            inputMode="numeric"
            className="h-11"
            maxLength={20}
          />
        </FormField>

        <FormField
          label="Correo electrónico"
          required
          error={draft.email ? errors.email : ""}
        >
          <Input
            type="email"
            value={draft.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="sofia.mendoza@correo.mx"
            className="h-11"
            maxLength={120}
          />
        </FormField>
      </div>
    </Card>
  );
}
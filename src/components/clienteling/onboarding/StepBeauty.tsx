import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FormField, ChipGroup, SingleSelect, TagInput } from "./FormField";
import type { ErrorMap, OnboardingDraft } from "@/lib/onboarding";
import type { Interest, Routine, SkinConcern, SkinType } from "@/lib/types";
import { Sparkles } from "lucide-react";

interface Props {
  draft: OnboardingDraft;
  errors: ErrorMap;
  update: <K extends keyof OnboardingDraft>(k: K, v: OnboardingDraft[K]) => void;
}

const INTERESTS: Interest[] = ["Fragancia", "Skincare", "Makeup"];
const ROUTINES: Routine[] = ["Día", "Noche", "Ambas"];
const SKIN_TYPES: SkinType[] = ["Seca", "Grasa", "Mixta", "Normal", "Sensible"];
const CONCERNS: SkinConcern[] = [
  "Manchas",
  "Líneas finas",
  "Poros",
  "Rojeces",
  "Hidratación",
  "Firmeza",
];

const SKIN_TONES = [
  { id: "Muy claro", hex: "#F4DCC4" },
  { id: "Claro", hex: "#EAC6A0" },
  { id: "Medio claro", hex: "#D5A57A" },
  { id: "Medio", hex: "#B8855B" },
  { id: "Medio oscuro", hex: "#8E5E3C" },
  { id: "Oscuro", hex: "#5E3A23" },
] as const;

const SUBTONES = ["Frío", "Neutro", "Cálido"] as const;

export function StepBeauty({ draft, errors, update }: Props) {
  return (
    <div className="space-y-6">
      <Card className="p-6 lg:p-8 shadow-card space-y-6">
        <header className="flex items-start gap-3">
          <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-xl">Perfil de belleza</h2>
            <p className="text-sm text-muted-foreground">
              Captura sus preferencias para personalizar las recomendaciones.
              Todo es opcional, pero mientras más datos, mejores sugerencias.
            </p>
          </div>
        </header>

        <FormField label="Categorías de interés" hint="Selecciona una o varias">
          <ChipGroup<Interest>
            options={INTERESTS}
            value={draft.interests}
            onChange={(v) => update("interests", v)}
          />
        </FormField>

        <div className="grid sm:grid-cols-2 gap-6">
          <FormField label="Rutina">
            <SingleSelect<Routine>
              options={ROUTINES}
              value={draft.routine}
              onChange={(v) => update("routine", v)}
            />
          </FormField>

          <FormField label="Tipo de piel">
            <SingleSelect<SkinType>
              options={SKIN_TYPES}
              value={draft.skinType}
              onChange={(v) => update("skinType", v)}
            />
          </FormField>
        </div>

        <FormField label="Tono de piel">
          <div className="flex flex-wrap gap-2">
            {SKIN_TONES.map((t) => {
              const active = draft.skinTone === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => update("skinTone", active ? "" : t.id)}
                  className={
                    "flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border transition " +
                    (active
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/40")
                  }
                  title={t.id}
                >
                  <span
                    className="size-6 rounded-full border border-border/60"
                    style={{ backgroundColor: t.hex }}
                  />
                  <span className="text-sm">{t.id}</span>
                </button>
              );
            })}
          </div>
        </FormField>

        <FormField label="Subtono">
          <SingleSelect<(typeof SUBTONES)[number]>
            options={SUBTONES}
            value={draft.subTone as (typeof SUBTONES)[number] | ""}
            onChange={(v) => update("subTone", v)}
          />
        </FormField>

        <FormField label="Preocupaciones de piel" hint="Selecciona todas las que apliquen">
          <ChipGroup<SkinConcern>
            options={CONCERNS}
            value={draft.skinConcerns}
            onChange={(v) => update("skinConcerns", v)}
          />
        </FormField>

        <div className="grid sm:grid-cols-2 gap-6">
          <FormField
            label="Ingredientes preferidos"
            hint="Enter o coma para agregar"
          >
            <TagInput
              value={draft.preferredIngredients}
              onChange={(v) => update("preferredIngredients", v)}
              placeholder="Vitamina C, Retinol…"
            />
          </FormField>

          <FormField
            label="Ingredientes a evitar"
            hint="Alergias o sensibilidades"
          >
            <TagInput
              tone="destructive"
              value={draft.avoidIngredients}
              onChange={(v) => update("avoidIngredients", v)}
              placeholder="Fragancia, Alcohol…"
            />
          </FormField>
        </div>

        <FormField
          label="Notas internas"
          hint={`${draft.notes.length}/500 caracteres`}
          error={errors.notes}
        >
          <Textarea
            value={draft.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Observaciones de la primera consulta, motivo de visita, etc."
            rows={3}
            maxLength={500}
          />
        </FormField>
      </Card>
    </div>
  );
}
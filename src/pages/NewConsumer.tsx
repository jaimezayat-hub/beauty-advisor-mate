import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, useCurrentStore, useCurrentUser } from "@/store/useApp";
import { useCreateConsumer } from "@/lib/db/useConsumers";
import { PageHeader } from "@/components/clienteling/PageHeader";
import { OnboardingStepper } from "@/components/clienteling/onboarding/OnboardingStepper";
import { StepIdentity } from "@/components/clienteling/onboarding/StepIdentity";
import { StepBeauty } from "@/components/clienteling/onboarding/StepBeauty";
import { StepConsent } from "@/components/clienteling/onboarding/StepConsent";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import type { Consumer } from "@/lib/types";
import {
  IPAD_DEVICE_ID,
  PRIVACY_VERSION,
  emptyOnboarding,
  validateBeauty,
  validateConsent,
  validateIdentity,
  type OnboardingDraft,
} from "@/lib/onboarding";

const STEPS = [
  { id: 1, label: "Datos personales", hint: "Identidad y contacto" },
  { id: 2, label: "Perfil de belleza", hint: "Piel, intereses y rutina" },
  { id: 3, label: "Privacidad", hint: "Consentimiento y canales" },
] as const;

export default function NewConsumer() {
  const user = useCurrentUser()!;
  const store = useCurrentStore();
  const navigate = useNavigate();
  const addConsumer = useApp((s) => s.addConsumer);
  const isRealSession = useApp((s) => s.isRealSession);
  const createReal = useCreateConsumer();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<OnboardingDraft>(emptyOnboarding());

  const update = <K extends keyof OnboardingDraft>(k: K, v: OnboardingDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const errors = useMemo(
    () => ({
      identity: validateIdentity(draft),
      beauty: validateBeauty(draft),
      consent: validateConsent(draft),
    }),
    [draft],
  );

  const stepValid =
    (step === 1 && Object.values(errors.identity).every((e) => !e)) ||
    (step === 2 && Object.values(errors.beauty).every((e) => !e)) ||
    (step === 3 && Object.values(errors.consent).every((e) => !e));

  const allValid =
    Object.values(errors.identity).every((e) => !e) &&
    Object.values(errors.beauty).every((e) => !e) &&
    Object.values(errors.consent).every((e) => !e);

  const goNext = () => {
    setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  };

  const goBack = () => {
    if (step === 1) {
      navigate(-1);
      return;
    }
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));
  };

  const submit = async () => {
    if (!allValid) {
      toast.error("Revisa los pasos marcados con error");
      return;
    }
    const now = new Date().toISOString();
    const c: Consumer = {
      id: `c-${Date.now()}`,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      gender: draft.gender,
      birthDate: draft.birthDate,
      phone: draft.phone.replace(/\D/g, ""),
      email: draft.email.trim().toLowerCase(),
      privacy: {
        accepted: true,
        acceptedAt: now,
        version: PRIVACY_VERSION,
        signaturePng: draft.signaturePng,
        signedByBaName: user.name,
        signedAtStoreName: store?.name ?? "Counter demo iPad",
        deviceId: IPAD_DEVICE_ID,
      },
      consentSMS: draft.consentSMS,
      consentEmail: draft.consentEmail,
      consentWhatsApp: draft.consentWhatsApp,
      skinType: draft.skinType || undefined,
      skinTone: draft.skinTone || undefined,
      subTone: draft.subTone || undefined,
      skinConcerns: draft.skinConcerns,
      interests: draft.interests,
      routine: draft.routine || undefined,
      preferredIngredients: draft.preferredIngredients,
      avoidIngredients: draft.avoidIngredients,
      segment: "Nueva",
      assignedBaId: user.id,
      storeId: user.storeId,
      brand: user.brand,
      createdAt: now,
      lastContactAt: now,
      notes: draft.notes.trim() || undefined,
    };
    if (isRealSession) {
      try {
        const newId = await createReal.mutateAsync(c);
        toast.success("✓ Registro guardado en la nube. Aviso de privacidad aceptado.");
        navigate(`/consumidoras/${newId}`);
      } catch (e) {
        toast.error("No se pudo guardar", { description: (e as Error).message });
      }
      return;
    }
    addConsumer(c);
    toast.success("✓ Registro completado. El aviso de privacidad ha sido aceptado y firmado.");
    navigate(`/consumidoras/${c.id}`);
  };

  return (
    <div className="p-6 lg:p-12 max-w-5xl mx-auto space-y-8">
      <PageHeader
        eyebrow="Alta de clienta"
        title="Nueva consumidora"
        description="Captura los datos esenciales, su perfil de belleza y el consentimiento de privacidad."
      />

      <OnboardingStepper steps={STEPS} current={step} onSelect={(s) => setStep(s)} />

      <div key={step} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {step === 1 && (
          <StepIdentity draft={draft} errors={errors.identity} update={update} />
        )}
        {step === 2 && (
          <StepBeauty draft={draft} errors={errors.beauty} update={update} />
        )}
        {step === 3 && (
          <StepConsent
            draft={draft}
            errors={errors.consent}
            update={update}
            assignedBaName={user.name}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
        <Button type="button" variant="ghost" onClick={goBack} size="lg">
          <ArrowLeft className="size-4 mr-1" />
          {step === 1 ? "Cancelar" : "Atrás"}
        </Button>

        <p className="text-xs text-muted-foreground hidden sm:block">
          Paso {step} de {STEPS.length}
        </p>

        {step < 3 ? (
          <Button type="button" size="lg" onClick={goNext}>
            Continuar
            <ArrowRight className="size-4 ml-1" />
          </Button>
        ) : (
          <Button type="button" size="lg" onClick={submit} disabled={!allValid}>
            <Check className="size-4 mr-1" />
            Confirmar y guardar
          </Button>
        )}
      </div>
    </div>
  );
}
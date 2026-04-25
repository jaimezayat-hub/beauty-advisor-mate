import type {
  Gender,
  Interest,
  Routine,
  SkinConcern,
  SkinType,
} from "@/lib/types";

export const PRIVACY_VERSION = "v1.2 — abr 2026";
export const IPAD_DEVICE_ID = "iPad-Counter-MX-042";

export const PRIVACY_TEXT = `Aviso de Privacidad — L'Oréal México S.A. de C.V.

En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), L'Oréal México S.A. de C.V., con domicilio en Av. Ejército Nacional, CDMX, es responsable del tratamiento de tus datos personales.

Datos recabados: nombre, fecha de nacimiento, género, correo electrónico, teléfono celular, preferencias de belleza, historial de compras y de servicios en counter.

Finalidades primarias: prestación de servicios de Beauty Advisor, gestión de tu perfil de clienta, registro de transacciones, recomendaciones personalizadas y agendamiento de citas en cabina.

Finalidades secundarias (requieren consentimiento explícito): envío de comunicaciones promocionales por SMS, correo electrónico y/o WhatsApp; invitaciones a eventos exclusivos; programas de lealtad.

Derechos ARCO: puedes ejercer tus derechos de Acceso, Rectificación, Cancelación u Oposición escribiendo a privacidad.mexico@loreal.com.

Versión: ${PRIVACY_VERSION}.`;

export interface OnboardingDraft {
  // Identity
  firstName: string;
  lastName: string;
  gender: Gender;
  birthDate: string;
  phone: string;
  email: string;
  // Beauty profile
  interests: Interest[];
  routine: Routine | "";
  skinType: SkinType | "";
  skinTone: string;
  subTone: string;
  skinConcerns: SkinConcern[];
  preferredIngredients: string[];
  avoidIngredients: string[];
  notes: string;
  // Consent
  privacy: boolean;
  consentSMS: boolean;
  consentEmail: boolean;
  consentWhatsApp: boolean;
  signaturePng: string;
}

export const emptyOnboarding = (): OnboardingDraft => ({
  firstName: "",
  lastName: "",
  gender: "Femenino",
  birthDate: "",
  phone: "",
  email: "",
  interests: [],
  routine: "",
  skinType: "",
  skinTone: "",
  subTone: "",
  skinConcerns: [],
  preferredIngredients: [],
  avoidIngredients: [],
  notes: "",
  privacy: false,
  consentSMS: false,
  consentEmail: false,
  consentWhatsApp: false,
  signaturePng: "",
});

export type ErrorMap = Record<string, string>;

function parseLocalDate(iso: string): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function validateIdentity(d: OnboardingDraft): ErrorMap {
  const today = new Date();
  const minDate = new Date(today.getFullYear() - 110, 0, 1);
  const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
  const birth = parseLocalDate(d.birthDate);

  return {
    firstName:
      d.firstName.trim().length < 2
        ? "Captura al menos 2 caracteres"
        : d.firstName.length > 60
          ? "Máximo 60 caracteres"
          : "",
    lastName:
      d.lastName.trim().length < 2
        ? "Captura al menos 2 caracteres"
        : d.lastName.length > 60
          ? "Máximo 60 caracteres"
          : "",
    birthDate: !d.birthDate
      ? "Selecciona una fecha"
      : !birth
        ? "Fecha inválida"
        : birth > maxDate
          ? "La clienta debe tener al menos 13 años"
          : birth < minDate
            ? "Fecha fuera de rango"
            : "",
    phone:
      d.phone.replace(/\D/g, "").length !== 10
        ? "El celular debe tener 10 dígitos"
        : "",
    email: !/^\S+@\S+\.\S+$/.test(d.email)
      ? "Correo electrónico inválido"
      : d.email.length > 120
        ? "Máximo 120 caracteres"
        : "",
  };
}

export function validateBeauty(d: OnboardingDraft): ErrorMap {
  // Beauty profile is optional in MVP, but recommend at least one interest.
  return {
    notes: d.notes.length > 500 ? "Máximo 500 caracteres" : "",
  };
}

export function validateConsent(d: OnboardingDraft): ErrorMap {
  return {
    privacy: !d.privacy ? "Es obligatorio aceptar el aviso de privacidad" : "",
    signaturePng: !d.signaturePng ? "La firma digital es obligatoria" : "",
  };
}

export function ageFromIso(iso: string): number | null {
  const b = parseLocalDate(iso);
  if (!b) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function ageBracket(age: number | null): string {
  if (age == null) return "—";
  if (age < 18) return "Menor de edad";
  if (age < 25) return "18–24";
  if (age < 35) return "25–34";
  if (age < 45) return "35–44";
  if (age < 55) return "45–54";
  if (age < 65) return "55–64";
  return "65+";
}
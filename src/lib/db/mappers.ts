import type {
  Consumer,
  Gender,
  Interest,
  PrivacyConsent,
  Routine,
  Segment,
  SkinConcern,
  SkinType,
  Brand,
  Purchase,
  PurchaseLine,
  Appointment,
  AppointmentStatus,
  AppointmentType,
} from "@/lib/types";
import type { Database } from "@/integrations/supabase/types";

type DbConsumer = Database["public"]["Tables"]["consumers"]["Row"];
type DbConsent = Database["public"]["Tables"]["consumer_consents"]["Row"];
type DbPref = Database["public"]["Tables"]["consumer_preferences"]["Row"];
type DbTag = Database["public"]["Tables"]["consumer_tags"]["Row"];
type DbNotice = Database["public"]["Tables"]["notice_acceptances"]["Row"];
type DbPurchase = Database["public"]["Tables"]["purchases"]["Row"];
type DbPurchaseItem = Database["public"]["Tables"]["purchase_items"]["Row"];
type DbAppointment = Database["public"]["Tables"]["appointments"]["Row"];

const VALID_SEGMENTS: Segment[] = ["VIP", "Recurrente", "Nueva", "EnRiesgo"];
const VALID_INTERESTS: Interest[] = ["Fragancia", "Skincare", "Makeup"];
const VALID_CONCERNS: SkinConcern[] = [
  "Manchas",
  "Líneas finas",
  "Poros",
  "Rojeces",
  "Hidratación",
  "Firmeza",
];

function asSegment(s: string | null | undefined): Segment {
  return (VALID_SEGMENTS as string[]).includes(s ?? "") ? (s as Segment) : "Nueva";
}
function asGender(g: string | null | undefined): Gender {
  if (g === "Masculino") return "Masculino";
  if (g === "Prefiero no decir") return "Prefiero no decir";
  return "Femenino";
}

export interface ConsumerBundle {
  consumer: DbConsumer;
  consents?: DbConsent[];
  prefs?: DbPref[];
  tags?: DbTag[];
  notice?: DbNotice | null;
}

/** Mapea fila DB (+ relaciones opcionales) al tipo UI Consumer. */
export function mapConsumer({
  consumer: c,
  consents = [],
  prefs = [],
  tags = [],
  notice = null,
}: ConsumerBundle): Consumer {
  const consentByCh = (ch: string) =>
    consents.some((x) => x.channel === ch && x.granted && !x.revoked_at);

  const prefMap: Record<string, string> = {};
  for (const p of prefs) if (p.value) prefMap[p.key] = p.value;

  const interests = tags
    .filter((t) => t.tag.startsWith("interest:"))
    .map((t) => t.tag.slice(9))
    .filter((x): x is Interest => (VALID_INTERESTS as string[]).includes(x));
  const concerns = tags
    .filter((t) => t.tag.startsWith("concern:"))
    .map((t) => t.tag.slice(8))
    .filter((x): x is SkinConcern => (VALID_CONCERNS as string[]).includes(x));
  const preferredIng = tags
    .filter((t) => t.tag.startsWith("pref:"))
    .map((t) => t.tag.slice(5));
  const avoidIng = tags
    .filter((t) => t.tag.startsWith("avoid:"))
    .map((t) => t.tag.slice(6));

  const privacy: PrivacyConsent = {
    accepted: !!notice,
    acceptedAt: notice?.accepted_at ?? undefined,
    version: prefMap.privacy_version ?? "2025.1",
    signaturePng: notice?.signature_ref ?? undefined,
    signedByBaName: prefMap.signed_by ?? undefined,
    signedAtStoreName: prefMap.signed_at_store ?? undefined,
    deviceId: prefMap.device_id ?? undefined,
  };

  return {
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name ?? "",
    gender: asGender(c.gender),
    birthDate: c.birthday ?? "",
    phone: c.phone ?? "",
    email: c.email ?? "",
    privacy,
    consentSMS: consentByCh("sms"),
    consentEmail: consentByCh("email"),
    consentWhatsApp: consentByCh("whatsapp"),
    skinType: (prefMap.skin_type as SkinType) || undefined,
    skinTone: prefMap.skin_tone || undefined,
    subTone: prefMap.sub_tone || undefined,
    skinConcerns: concerns,
    interests,
    routine: (prefMap.routine as Routine) || undefined,
    preferredIngredients: preferredIng,
    avoidIngredients: avoidIng,
    segment: asSegment(c.segment),
    assignedBaId: c.owner_ba_id ?? "",
    storeId: c.store_id ?? "",
    brand: c.brand as Brand,
    createdAt: c.created_at,
    lastContactAt: c.updated_at,
    lastTransactionAt: undefined,
    notes: c.notes ?? undefined,
  };
}

/** Convierte un Consumer (UI) en payloads para insertar en DB. */
export function consumerToInserts(c: Consumer, ownerBaId: string) {
  const consumerRow = {
    id: c.id?.startsWith("c-") ? undefined : c.id,
    first_name: c.firstName,
    last_name: c.lastName || null,
    gender: c.gender,
    birthday: c.birthDate || null,
    phone: c.phone || null,
    email: c.email || null,
    brand: c.brand,
    store_id: c.storeId || null,
    owner_ba_id: ownerBaId,
    segment: c.segment,
    notes: c.notes || null,
  };

  const consents = (
    [
      ["whatsapp", c.consentWhatsApp],
      ["sms", c.consentSMS],
      ["email", c.consentEmail],
    ] as const
  ).map(([channel, granted]) => ({
    channel,
    granted,
    granted_at: granted ? new Date().toISOString() : null,
    source: "onboarding_ipad",
  }));

  const prefs: { key: string; value: string }[] = [];
  if (c.skinType) prefs.push({ key: "skin_type", value: c.skinType });
  if (c.skinTone) prefs.push({ key: "skin_tone", value: c.skinTone });
  if (c.subTone) prefs.push({ key: "sub_tone", value: c.subTone });
  if (c.routine) prefs.push({ key: "routine", value: c.routine });
  if (c.privacy.signedByBaName)
    prefs.push({ key: "signed_by", value: c.privacy.signedByBaName });
  if (c.privacy.signedAtStoreName)
    prefs.push({ key: "signed_at_store", value: c.privacy.signedAtStoreName });
  if (c.privacy.deviceId) prefs.push({ key: "device_id", value: c.privacy.deviceId });
  prefs.push({ key: "privacy_version", value: c.privacy.version });

  const tags: string[] = [
    ...c.interests.map((i) => `interest:${i}`),
    ...c.skinConcerns.map((s) => `concern:${s}`),
    ...c.preferredIngredients.map((p) => `pref:${p}`),
    ...c.avoidIngredients.map((a) => `avoid:${a}`),
  ];

  return { consumerRow, consents, prefs, tags };
}
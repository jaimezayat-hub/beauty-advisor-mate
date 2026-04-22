export type Brand = "lancome" | "ysl";

export type Role =
  | "ba"
  | "store_manager_palacio"
  | "store_manager_liverpool"
  | "zone_supervisor"
  | "central_admin";

export type Segment = "VIP" | "Recurrente" | "Nueva" | "EnRiesgo";

export type SkinType = "Seca" | "Grasa" | "Mixta" | "Normal" | "Sensible";
export type Routine = "Día" | "Noche" | "Ambas";
export type Gender = "Femenino" | "Masculino" | "Prefiero no decir";
export type Interest = "Fragancia" | "Skincare" | "Makeup";
export type SkinConcern =
  | "Manchas"
  | "Líneas finas"
  | "Poros"
  | "Rojeces"
  | "Hidratación"
  | "Firmeza";

export interface Store {
  id: string;
  name: string;
  chain: "palacio" | "liverpool";
  region: string;
  tier: 1 | 2 | 3;
  brands: Brand[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  brand: Brand;
  storeId: string;
  region?: string;
  active: boolean;
}

export interface PurchaseLine {
  sku: string;
  name: string;
  qty: number;
  price: number;
}

export interface Purchase {
  id: string;
  consumerId: string;
  baId: string;
  storeId: string;
  brand: Brand;
  date: string; // ISO
  lines: PurchaseLine[];
  total: number;
  ticketNumber?: string;
}

export interface Recommendation {
  id: string;
  consumerId: string;
  baId: string;
  date: string;
  products: { sku: string; name: string }[];
  notes?: string;
  converted: boolean;
}

export type AppointmentStatus =
  | "Confirmada"
  | "Pendiente"
  | "Cancelada"
  | "Reagendada"
  | "Completada"
  | "NoShow";

export type AppointmentType =
  | "Servicio de Cabina"
  | "Facial"
  | "Evento Aniversario"
  | "Cabina VIP"
  | "Seguimiento de Productos"
  | "Masterclass"
  | "Otro";

export interface Appointment {
  id: string;
  consumerId: string;
  baId: string;
  storeId: string;
  date: string; // ISO start
  type: AppointmentType;
  notes?: string;
  status: AppointmentStatus;
}

export interface FollowUp {
  id: string;
  consumerId: string;
  baId: string;
  date: string;
  type: "3 meses" | "6 meses" | "Cumpleaños" | "Reposición" | "Evento especial";
  notes?: string;
  nextAction?: string;
  nextDate?: string;
}

export interface Sample {
  id: string;
  consumerId: string;
  baId: string;
  date: string;
  productName: string;
  sku?: string;
  followUpDate?: string;
  converted: boolean;
}

export interface Message {
  id: string;
  consumerId: string;
  baId: string;
  date: string;
  templateType: string;
  content: string;
  channel: "WhatsApp" | "SMS" | "Email";
}

export interface PrivacyConsent {
  accepted: boolean;
  acceptedAt?: string;
  version: string;
}

export interface Consumer {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthDate: string; // ISO
  phone: string;
  email: string;
  privacy: PrivacyConsent;
  consentSMS: boolean;
  consentEmail: boolean;
  consentWhatsApp: boolean;
  skinType?: SkinType;
  skinTone?: string;
  subTone?: string;
  skinConcerns: SkinConcern[];
  interests: Interest[];
  routine?: Routine;
  preferredIngredients: string[];
  avoidIngredients: string[];
  shades?: { foundation?: string; concealer?: string; lipstick?: string };
  segment: Segment;
  assignedBaId: string;
  storeId: string;
  brand: Brand;
  createdAt: string;
  lastContactAt?: string;
  lastTransactionAt?: string;
  notes?: string;
}

export interface Product {
  sku: string;
  name: string;
  brand: Brand;
  category: "Skincare" | "Makeup" | "Fragancia";
  price: number;
  description: string;
  benefits: string[];
  imageHue: number; // for placeholder gradient
  inStock: boolean;
}
import type { Brand, Consumer, User } from "@/lib/types";
import { fullName } from "./format";

export type TemplateCategory =
  | "Cumpleaños"
  | "Reposición"
  | "Post-visita"
  | "Lanzamiento"
  | "Evento VIP";

export interface TemplateDef {
  id: string;
  category: TemplateCategory;
  title: string;
  body: (ctx: TemplateContext) => string;
}

export interface TemplateContext {
  consumer: Consumer;
  ba: User;
  brandName: string;
  storeName: string;
  productName?: string;
  eventName?: string;
  newProductName?: string;
  newProductBenefit?: string;
}

const brandLabel = (b: Brand) => (b === "ysl" ? "YSL Beauty" : "Lancôme");

export const TEMPLATES: TemplateDef[] = [
  {
    id: "tpl-cumple",
    category: "Cumpleaños",
    title: "Felicitación de cumpleaños",
    body: ({ consumer, ba, brandName }) =>
      `Hola ${consumer.firstName}, en ${brandName} te deseamos un muy feliz cumpleaños 🎂\n\nEs un placer ser parte de tus rituales de belleza. Te invito a pasar al counter esta semana para celebrar contigo con un detalle especial.\n\nCon cariño,\n${ba.name.split(" ")[0]}`,
  },
  {
    id: "tpl-reposicion",
    category: "Reposición",
    title: "Reposición de producto",
    body: ({ consumer, ba, productName, brandName }) =>
      `Hola ${consumer.firstName}, espero estés muy bien.\n\nTu ${productName ?? "producto"} debe estar por terminarse, ¿te gustaría que te aparte uno nuevo en el counter de ${brandName}? Si pasas esta semana puedo prepararte una mini-rutina personalizada.\n\nUn abrazo,\n${ba.name.split(" ")[0]}`,
  },
  {
    id: "tpl-postvisita",
    category: "Post-visita",
    title: "Seguimiento post-visita",
    body: ({ consumer, ba, brandName }) =>
      `Hola ${consumer.firstName}, fue un placer atenderte hoy en ${brandName}. ✨\n\n¿Cómo te fue con los productos? Recuerda que estoy aquí para cualquier duda sobre tu rutina o si quieres probar algo nuevo.\n\nCon cariño,\n${ba.name.split(" ")[0]}`,
  },
  {
    id: "tpl-lanzamiento",
    category: "Lanzamiento",
    title: "Nuevo lanzamiento",
    body: ({ consumer, ba, brandName, newProductName, newProductBenefit }) =>
      `Hola ${consumer.firstName}, en ${brandName} acabamos de recibir ${newProductName ?? "[producto]"} — ${newProductBenefit ?? "te va a encantar"}.\n\nMe encantaría que pasaras al counter para vivirlo en piel. Te aparto una muestra personalizada.\n\n${ba.name.split(" ")[0]}`,
  },
  {
    id: "tpl-vip",
    category: "Evento VIP",
    title: "Invitación evento VIP",
    body: ({ consumer, ba, brandName, storeName, eventName }) =>
      `Hola ${consumer.firstName}, como clienta especial de ${brandName} te invito a nuestro evento exclusivo "${eventName ?? "Beauty Night"}" en ${storeName}.\n\nUna noche dedicada a ti: rituales personalizados, regalos y un brindis. Confirma conmigo tu asistencia.\n\nCon cariño,\n${ba.name.split(" ")[0]}`,
  },
];

export function renderTemplate(def: TemplateDef, ctx: Omit<TemplateContext, "brandName"> & { brand: Brand }) {
  return def.body({ ...ctx, brandName: brandLabel(ctx.brand) });
}

export function consumerLabel(c: Consumer) {
  return fullName(c.firstName, c.lastName);
}
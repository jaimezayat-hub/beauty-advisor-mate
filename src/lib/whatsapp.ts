import { toast } from "sonner";

/**
 * Stub para WhatsApp Business API (RNF-11).
 * Hoy: copia el mensaje al portapapeles y lo registra como interacción.
 * Mañana: edge function `send-whatsapp` que llama a la WhatsApp Cloud API.
 *
 * Mantén la firma estable para que la migración a la API real sea drop-in.
 */
export interface WhatsAppPayload {
  to: string;            // E.164: +52155...
  templateId: string;    // ej: tpl-cumple
  body: string;          // mensaje renderizado
  consumerName?: string;
}

export async function sendWhatsApp(payload: WhatsAppPayload): Promise<{ ok: boolean; channel: "stub" | "api" }> {
  // TODO(RNF-11): reemplazar por:
  //   await supabase.functions.invoke("send-whatsapp", { body: payload });
  try {
    await navigator.clipboard.writeText(payload.body);
  } catch {
    /* clipboard puede no estar disponible */
  }
  toast.success("Mensaje listo para WhatsApp", {
    description: payload.consumerName
      ? `Copiado al portapapeles · pégalo en el chat de ${payload.consumerName}`
      : "Copiado al portapapeles",
  });
  return { ok: true, channel: "stub" };
}

/** Indica si la integración real con WhatsApp Business API está activa. */
export const WHATSAPP_API_LIVE = false;

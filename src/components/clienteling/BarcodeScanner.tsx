import { useEffect, useRef, useState } from "react";
import { ScanLine, AlertTriangle, X, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/**
 * RF-14 / RF-23 — Escáner real de SKU vía cámara del dispositivo.
 * Usa la API nativa BarcodeDetector (Safari iOS 17+, Chrome Android).
 * Si no está disponible, ofrece captura manual del SKU.
 */
export function BarcodeScanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [supported, setSupported] = useState<"checking" | "yes" | "no">("checking");
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    const hasDetector = typeof window !== "undefined" && "BarcodeDetector" in window;
    if (!hasDetector) {
      setSupported("no");
      return;
    }
    setSupported("yes");

    let cancelled = false;
    let detector: any;

    (async () => {
      try {
        // @ts-ignore — BarcodeDetector aún no en lib.dom estándar
        detector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "upc_a", "upc_e"],
        });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length > 0) {
              const value = codes[0].rawValue as string;
              onDetect(value);
              return;
            }
          } catch {
            /* frame ignored */
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e: any) {
        setError(e?.message ?? "No se pudo acceder a la cámara.");
        setSupported("no");
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [onDetect]);

  const submitManual = () => {
    if (!manualCode.trim()) {
      toast.error("Ingresa un SKU");
      return;
    }
    onDetect(manualCode.trim().toUpperCase());
  };

  return (
    <div className="space-y-3">
      <div className="aspect-video rounded-lg overflow-hidden relative bg-black">
        {supported === "yes" && !error ? (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-x-8 top-1/2 h-px bg-primary/80 animate-pulse" />
            <div className="absolute inset-6 border-2 border-primary/50 rounded-lg pointer-events-none" />
            <span className="absolute top-2 left-2 text-[10px] uppercase tracking-widest bg-background/90 px-2 py-0.5 rounded-full">
              Escaneando…
            </span>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80 p-6 text-center">
            <AlertTriangle className="size-8" />
            <p className="text-sm">
              {error
                ? error
                : "Tu navegador no soporta escáner por cámara. Usa Safari iOS 17+ o Chrome Android, o captura el SKU manualmente."}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border p-3 space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Keyboard className="size-3.5" /> Captura manual de SKU
        </p>
        <div className="flex gap-2">
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitManual()}
            placeholder="Ej: LAN-AGV-50"
            className="h-10"
            autoFocus={supported === "no"}
          />
          <Button onClick={submitManual} size="sm">
            <ScanLine className="size-4 mr-1" /> Buscar
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="size-4 mr-1" /> Cerrar
        </Button>
      </div>
    </div>
  );
}

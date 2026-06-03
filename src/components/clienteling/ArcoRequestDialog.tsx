import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ArcoType = "acceso" | "rectificacion" | "cancelacion" | "oposicion";

const OPTIONS: { value: ArcoType; label: string; desc: string }[] = [
  { value: "acceso", label: "Acceso", desc: "La cliente solicita ver qué datos tenemos sobre ella." },
  { value: "rectificacion", label: "Rectificación", desc: "Pide corregir datos personales incorrectos." },
  { value: "cancelacion", label: "Cancelación", desc: "Solicita eliminar sus datos de nuestros sistemas." },
  { value: "oposicion", label: "Oposición", desc: "Se opone a un uso específico de sus datos." },
];

export function ArcoRequestDialog({ consumerId, consumerName }: { consumerId: string; consumerName: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ArcoType>("acceso");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("arco_requests").insert({
      consumer_id: consumerId,
      request_type: type,
      requested_by_ba: auth.user?.id ?? null,
      notes: notes || null,
    });
    setLoading(false);
    if (error) {
      toast.error("No se pudo registrar la solicitud");
      return;
    }
    toast.success("Solicitud ARCO registrada");
    setOpen(false);
    setNotes("");
    setType("acceso");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Shield className="size-4 mr-1.5" /> Solicitud ARCO
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Solicitud ARCO
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Registra una solicitud de {consumerName} para ejercer sus derechos de
          Acceso, Rectificación, Cancelación u Oposición (LFPDPPP).
        </p>

        <div className="grid grid-cols-2 gap-2 mt-2">
          {OPTIONS.map((o) => (
            <button
              type="button"
              key={o.value}
              onClick={() => setType(o.value)}
              className={cn(
                "rounded-lg border p-3 text-left transition",
                type === o.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40",
              )}
            >
              <p className="text-sm font-medium">{o.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{o.desc}</p>
            </button>
          ))}
        </div>

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas adicionales (canal por el que la pidió, identificación presentada…)"
          className="min-h-[80px]"
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? "Registrando…" : "Registrar solicitud"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

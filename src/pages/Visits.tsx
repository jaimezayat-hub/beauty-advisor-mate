import { useMemo, useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useCurrentUser, useApp } from "@/store/useApp";
import { PageHeader } from "@/components/clienteling/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConsumerPicker } from "@/components/clienteling/ConsumerPicker";
import { Clock, UserCheck, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import type { Consumer } from "@/lib/types";
import {
  useVisitReasons,
  useVisitsList,
  useCreateVisit,
} from "@/lib/db/useVisits";
import { useRealtimeInvalidate } from "@/lib/db/useAppointments";
import { useConsumerDetail } from "@/lib/db/useConsumers";

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function Visits() {
  const user = useCurrentUser()!;
  const { isRealSession, consumers } = useApp();
  const [params, setParams] = useSearchParams();
  const preselectId = params.get("consumerId") ?? undefined;

  const reasons = useVisitReasons(isRealSession);
  const recent = useVisitsList(
    user.role === "ba"
      ? { baId: user.id, limit: 20 }
      : { storeId: user.storeId, limit: 20 },
    isRealSession,
  );
  useRealtimeInvalidate("visits", ["visits"], isRealSession);
  const createVisit = useCreateVisit();

  const preselectedDetail = useConsumerDetail(preselectId, isRealSession && !!preselectId);
  const preselectedFromStore = useMemo(
    () => (preselectId ? consumers.find((c) => c.id === preselectId) ?? null : null),
    [preselectId, consumers],
  );

  const [consumer, setConsumer] = useState<Consumer | null>(null);
  const [visitedAt, setVisitedAt] = useState(nowLocalInput);
  const [durationMin, setDurationMin] = useState<number | "">(20);
  const [reasonId, setReasonId] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (consumer) return;
    if (isRealSession && preselectedDetail.data) setConsumer(preselectedDetail.data);
    else if (!isRealSession && preselectedFromStore) setConsumer(preselectedFromStore);
  }, [isRealSession, preselectedDetail.data, preselectedFromStore, consumer]);

  const submit = async () => {
    if (!consumer) return toast.error("Selecciona un consumidor");
    if (!isRealSession) {
      toast.info("Las visitas se guardan en sesión real (no en modo demo).");
      return;
    }
    try {
      await createVisit.mutateAsync({
        consumerId: consumer.id,
        visitedAt: new Date(visitedAt).toISOString(),
        durationMin: durationMin === "" ? undefined : Number(durationMin),
        reasonId,
        notes: notes || undefined,
      });
      toast.success("Visita registrada");
      // limpia para nuevo registro
      setNotes("");
      setVisitedAt(nowLocalInput());
      // mantén el consumidor si vino por preselección, si no, límpialo
      if (!preselectId) setConsumer(null);
      // limpia el query param para evitar relock
      if (preselectId) {
        const next = new URLSearchParams(params);
        next.delete("consumerId");
        setParams(next, { replace: true });
      }
    } catch (e: any) {
      toast.error("No se pudo registrar la visita", { description: e?.message ?? String(e) });
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-8">
      <PageHeader
        eyebrow="Atención en cabina"
        title="Registrar visita"
        description="Deja constancia de la visita del consumidor; quedará en su historial."
      />

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6">
        <Card className="p-6 shadow-card space-y-5">
          <div>
            <Label className="mb-2 block">Consumidor</Label>
            <ConsumerPicker brand={user.brand} value={consumer} onChange={setConsumer} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha y hora</Label>
              <Input
                type="datetime-local"
                value={visitedAt}
                onChange={(e) => setVisitedAt(e.target.value)}
                className="h-11 mt-2"
              />
            </div>
            <div>
              <Label>Duración (min)</Label>
              <Input
                type="number"
                min={1}
                value={durationMin}
                onChange={(e) =>
                  setDurationMin(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="h-11 mt-2"
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Motivo</Label>
            <div className="flex flex-wrap gap-1.5">
              {(reasons.data ?? []).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReasonId(reasonId === r.id ? undefined : r.id)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition",
                    reasonId === r.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {r.name}
                </button>
              ))}
              {reasons.isLoading && (
                <span className="text-xs text-muted-foreground">Cargando…</span>
              )}
            </div>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Productos probados, recomendaciones, observaciones…"
              className="mt-2"
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button asChild variant="ghost">
              <Link to="/agenda">Volver a agenda</Link>
            </Button>
            <Button onClick={submit} disabled={createVisit.isPending}>
              <UserCheck className="size-4 mr-1.5" />
              {createVisit.isPending ? "Guardando…" : "Registrar visita"}
            </Button>
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Últimas
              </p>
              <h2 className="font-display text-2xl mt-1">Visitas recientes</h2>
            </div>
          </div>
          {!isRealSession ? (
            <Empty text="Inicia sesión para ver las visitas registradas." />
          ) : recent.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (recent.data ?? []).length === 0 ? (
            <Empty text="Aún no hay visitas registradas." />
          ) : (
            <ul className="divide-y divide-border">
              {(recent.data ?? []).map((v) => (
                <li key={v.id} className="py-3">
                  <Link
                    to={`/consumidores/${v.consumerId}`}
                    className="flex items-center justify-between gap-3 hover:bg-muted/40 -mx-2 px-2 py-1 rounded transition"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {v.consumerName ?? "Consumidor"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(v.visitedAt)}
                        {v.reasonName ? ` · ${v.reasonName}` : ""}
                        {v.durationMin ? ` · ${v.durationMin} min` : ""}
                      </p>
                      {v.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {v.notes}
                        </p>
                      )}
                    </div>
                    <Clock className="size-4 text-muted-foreground shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <CalendarIcon className="size-5" />
      </div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
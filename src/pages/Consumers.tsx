import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApp, useCurrentUser } from "@/store/useApp";
import { PageHeader } from "@/components/clienteling/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConsumerAvatar } from "@/components/clienteling/Avatar";
import { SegmentBadge } from "@/components/clienteling/SegmentBadge";
import { formatDate, formatPhoneMx, fullName } from "@/lib/format";
import { Plus, Search } from "lucide-react";
import type { Segment } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS: ("Todas" | Segment)[] = ["Todas", "VIP", "Recurrente", "Nueva", "EnRiesgo"];

export default function Consumers() {
  const user = useCurrentUser()!;
  const { consumers, users } = useApp();
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<(typeof FILTERS)[number]>("Todas");
  const [scope, setScope] = useState<"mias" | "todas">(user.role === "ba" ? "mias" : "todas");

  const list = useMemo(() => {
    let l = consumers.filter((c) => c.brand === user.brand);
    if (scope === "mias") l = l.filter((c) => c.assignedBaId === user.id);
    if (seg !== "Todas") l = l.filter((c) => c.segment === seg);
    if (q.trim()) {
      const t = q.toLowerCase();
      l = l.filter(
        (c) =>
          fullName(c.firstName, c.lastName).toLowerCase().includes(t) ||
          c.email.toLowerCase().includes(t) ||
          c.phone.replace(/\D/g, "").includes(t.replace(/\D/g, "")),
      );
    }
    return l.sort((a, b) =>
      (b.lastContactAt ?? "").localeCompare(a.lastContactAt ?? ""),
    );
  }, [consumers, q, seg, scope, user]);

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      <PageHeader
        eyebrow="Cartera de clientas"
        title="Consumidoras"
        description="Gestiona la relación 1:1 con cada clienta de tu counter."
        actions={
          <Button asChild size="lg">
            <Link to="/consumidoras/nueva">
              <Plus className="size-4 mr-1" /> Nueva consumidora
            </Link>
          </Button>
        }
      />

      <Card className="p-4 shadow-card">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, correo o celular…"
              className="h-11 pl-10"
            />
          </div>

          {user.role !== "ba" && (
            <div className="flex bg-muted rounded-lg p-0.5">
              {(["mias", "todas"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={cn(
                    "px-3 py-1.5 text-xs uppercase tracking-widest rounded-md transition",
                    scope === s
                      ? "bg-background shadow-sm font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  {s === "mias" ? "Mías" : "Toda la tienda"}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setSeg(f)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition",
                  seg === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/40",
                )}
              >
                {f === "EnRiesgo" ? "En Riesgo" : f}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden shadow-card">
        {list.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p>No hay consumidoras con esos criterios.</p>
            <Button asChild variant="link" className="mt-2">
              <Link to="/consumidoras/nueva">Registrar nueva consumidora</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((c) => {
              const ba = users.find((u) => u.id === c.assignedBaId);
              return (
                <li key={c.id}>
                  <Link
                    to={`/consumidoras/${c.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-muted/40 transition"
                  >
                    <ConsumerAvatar firstName={c.firstName} lastName={c.lastName} size={48} />
                    <div className="flex-1 min-w-0 grid sm:grid-cols-3 gap-2 items-center">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {fullName(c.firstName, c.lastName)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatPhoneMx(c.phone)} · {c.email}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>Última visita</p>
                        <p className="text-foreground">{formatDate(c.lastContactAt)}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>BA asignada</p>
                        <p className="text-foreground truncate">{ba?.name ?? "—"}</p>
                      </div>
                    </div>
                    <SegmentBadge segment={c.segment} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Mostrando {list.length} consumidora{list.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
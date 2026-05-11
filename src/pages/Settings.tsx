import { useApp, useCurrentStore, useCurrentUser } from "@/store/useApp";
import { PageHeader } from "@/components/clienteling/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/clienteling/BrandMark";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TEMPLATES } from "@/lib/templates";
import { ROLE_LABEL } from "@/lib/permissions";

export default function Settings() {
  const user = useCurrentUser()!;
  const store = useCurrentStore();
  const { activeBrand, setActiveBrand, resetSeed, logout } = useApp();

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-8">
      <PageHeader
        eyebrow="Preferencias"
        title="Configuración"
        description="Marca activa, perfil y datos de demostración."
      />

      <Card className="p-6 shadow-card">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Marca activa</p>
        <h2 className="font-display text-2xl mt-1 mb-4">Cambiar identidad visual</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {(["lancome", "ysl"] as const).map((b) => (
            <button
              key={b}
              onClick={() => { setActiveBrand(b); toast.success(`Tema ${b === "ysl" ? "YSL Beauty" : "Lancôme"} activado`); }}
              className={cn(
                "rounded-xl border p-6 text-left transition",
                activeBrand === b
                  ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                  : "border-border hover:border-primary/40",
              )}
            >
              <BrandMark brand={b} className="text-2xl" />
              <p className="text-xs text-muted-foreground mt-3">
                {b === "ysl" ? "Negro absoluto · dorado · editorial" : "Burgundy · cream · serif refinado"}
              </p>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6 shadow-card">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Sesión</p>
        <h2 className="font-display text-2xl mt-1 mb-4">Tu perfil</h2>
        <dl className="space-y-2 text-sm">
          <Row label="Nombre" value={user.name} />
          <Row label="Correo" value={user.email} />
          <Row label="Rol" value={ROLE_LABEL[user.role]} />
          <Row label="Tienda" value={store?.name ?? "—"} />
          <Row label="Marca asignada" value={user.brand === "ysl" ? "YSL Beauty" : "Lancôme"} />
        </dl>
      </Card>

      <Card className="p-6 shadow-card">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Plantillas</p>
        <h2 className="font-display text-2xl mt-1 mb-4">Plantillas disponibles</h2>
        <ul className="grid sm:grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <li key={t.id} className="rounded-lg border border-border px-3 py-2 text-sm">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.category}</p>
              <p>{t.title}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6 shadow-card">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Datos demo</p>
        <h2 className="font-display text-2xl mt-1 mb-3">Restablecer</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Restaura las 20 consumidoras y compras simuladas a su estado inicial. Útil antes de una demo.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetSeed(); toast.success("Datos demo restaurados"); }}>
            Restablecer datos demo
          </Button>
          <Button variant="ghost" onClick={() => { logout(); }}>
            Cerrar sesión
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/50 pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
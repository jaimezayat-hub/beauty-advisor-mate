import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/store/useApp";
import { BrandMark } from "@/components/clienteling/BrandMark";
import type { Brand } from "@/lib/types";
import { toast } from "sonner";
import { ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Login() {
  const navigate = useNavigate();
  const { users, login, setActiveBrand } = useApp();
  const [step, setStep] = useState<"brand" | "credentials">("brand");
  const [brand, setBrand] = useState<Brand>("lancome");
  const [email, setEmail] = useState("sofia.ramirez@loreal.mx");
  const [password, setPassword] = useState("demo");

  useEffect(() => {
    setActiveBrand(brand);
  }, [brand, setActiveBrand]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!u) {
      toast.error("Usuario no encontrado", {
        description: "Prueba con sofia.ramirez@loreal.mx o andrea.vega@loreal.mx",
      });
      return;
    }
    if (!password) {
      toast.error("Ingresa tu contraseña");
      return;
    }
    setActiveBrand(u.brand);
    login(u.id);
    toast.success(`Bienvenida, ${u.name.split(" ")[0]}`);
    navigate("/");
  };

  if (step === "brand") {
    return <BrandSelectScreen onPick={(b) => { setBrand(b); setStep("credentials"); }} />;
  }

  return (
    <div className="min-h-screen flex items-stretch bg-background">
      <aside
        className={cn(
          "hidden lg:flex flex-1 relative overflow-hidden",
          brand === "ysl" ? "bg-black text-white" : "bg-gradient-hero text-white",
        )}
      >
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, hsl(var(--brand-accent)) 0%, transparent 45%), radial-gradient(circle at 80% 80%, hsl(var(--gold)) 0%, transparent 40%)",
        }} />
        <div className="relative z-10 m-auto max-w-md p-12 animate-fade-in">
          <BrandMark brand={brand} className="text-3xl mb-12" />
          <h1 className="font-display text-5xl leading-[1.05] mb-6 text-balance">
            Cada clienta, una historia que merece ser recordada.
          </h1>
          <p className="opacity-80 text-lg leading-relaxed">
            Plataforma de clienteling para Beauty Advisors de
            {brand === "ysl" ? " YSL Beauty" : " Lancôme"} en México.
          </p>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-8 animate-slide-up">
          <button
            type="button"
            onClick={() => setStep("brand")}
            className="text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition"
          >
            ← Cambiar marca
          </button>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
              Acceso Beauty Advisor
            </p>
            <h2 className="font-display text-4xl">Bienvenida de nuevo</h2>
            <p className="text-muted-foreground mt-2">
              Ingresa con tu correo corporativo {brand === "ysl" ? "YSL" : "Lancôme"}.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 mt-2"
                placeholder="nombre@loreal.mx"
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 mt-2"
              />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full h-12 text-base">
            Iniciar sesión
            <ChevronRight className="ml-1 size-4" />
          </Button>

          <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs space-y-2">
            <p className="font-semibold flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              Cuentas demo
            </p>
            <ul className="space-y-1 text-muted-foreground">
              <li><b className="text-foreground">sofia.ramirez@loreal.mx</b> · BA Lancôme</li>
              <li><b className="text-foreground">andrea.vega@loreal.mx</b> · BA YSL</li>
              <li><b className="text-foreground">roberto.salinas@palaciodehierro.mx</b> · Gerente</li>
            </ul>
          </div>
        </form>
      </main>
    </div>
  );
}

function BrandSelectScreen({ onPick }: { onPick: (b: Brand) => void }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background animate-fade-in">
      <BrandCard
        brand="lancome"
        title="Lancôme"
        subtitle="Paris"
        tagline="Lujo francés, refinamiento atemporal."
        onPick={onPick}
        className="bg-gradient-hero text-white"
      />
      <BrandCard
        brand="ysl"
        title="YSL Beauty"
        subtitle="Paris"
        tagline="Audaz. Editorial. Inolvidable."
        onPick={onPick}
        className="bg-black text-white"
      />
    </div>
  );
}

function BrandCard({
  brand,
  title,
  subtitle,
  tagline,
  onPick,
  className,
}: {
  brand: Brand;
  title: string;
  subtitle: string;
  tagline: string;
  onPick: (b: Brand) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(brand)}
      className={cn(
        "group relative overflow-hidden p-12 lg:p-20 text-left transition-all duration-500 hover:brightness-110",
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          backgroundImage:
            brand === "ysl"
              ? "radial-gradient(circle at 70% 30%, hsl(46 60% 52% / 0.35), transparent 55%)"
              : "radial-gradient(circle at 30% 30%, hsl(354 51% 81% / 0.6), transparent 55%)",
        }}
      />
      <div className="relative z-10 h-full flex flex-col">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] opacity-70 mb-6">
            Selecciona tu counter
          </p>
          {brand === "ysl" ? (
            <h1 className="font-display font-semibold text-7xl lg:text-8xl tracking-[0.12em]">
              YSL
            </h1>
          ) : (
            <h1 className="font-display italic text-7xl lg:text-8xl">
              Lancôme
            </h1>
          )}
          <p className="font-display text-xl lg:text-2xl mt-4 opacity-80">
            {title === "YSL Beauty" ? "Beauty · " : ""}{subtitle}
          </p>
        </div>

        <p className="font-display italic text-2xl lg:text-3xl mt-12 max-w-md opacity-90 text-balance">
          {tagline}
        </p>

        <div className="mt-auto pt-12 flex items-center gap-3 text-sm uppercase tracking-[0.3em] opacity-80 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500">
          Continuar
          <ChevronRight className="size-4" />
        </div>
      </div>
    </button>
  );
}
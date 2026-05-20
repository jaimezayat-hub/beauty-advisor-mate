import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApp, useCurrentUser } from "@/store/useApp";
import { PageHeader } from "@/components/clienteling/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConsumerPicker } from "@/components/clienteling/ConsumerPicker";
import { ProductCard } from "@/components/clienteling/ProductCard";
import { ConsumerAvatar } from "@/components/clienteling/Avatar";
import { SEED_PRODUCTS } from "@/data/seed";
import type { Consumer, Product, Recommendation } from "@/lib/types";
import { Check, Copy, ScanLine, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fullName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BarcodeScanner } from "@/components/clienteling/BarcodeScanner";
import { useProductsList } from "@/lib/db/useProducts";
import { useLogWhatsapp } from "@/lib/db/useFollowUps";

const REASONS = [
  "Nueva compra",
  "Recompra",
  "Regalo",
  "Preocupación específica",
  "Promoción",
  "Conocer productos",
] as const;

export default function Recommendations() {
  const user = useCurrentUser()!;
  const { consumers, purchases, addRecommendation, addMessage, isRealSession } = useApp();
  const logWa = useLogWhatsapp();
  const dbProducts = useProductsList(user.brand, isRealSession);
  const PRODUCT_POOL: Product[] = isRealSession && dbProducts.data?.length
    ? dbProducts.data
    : SEED_PRODUCTS;
  const [params] = useSearchParams();
  const preId = params.get("consumerId");
  const [consumer, setConsumer] = useState<Consumer | null>(
    preId ? consumers.find((c) => c.id === preId) ?? null : null,
  );
  const [reason, setReason] = useState<(typeof REASONS)[number]>("Nueva compra");
  const [selected, setSelected] = useState<Product[]>([]);
  const [notes, setNotes] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [lookbookOpen, setLookbookOpen] = useState(false);
  const [filterCat, setFilterCat] = useState<"all" | "Skincare" | "Makeup" | "Fragancia">("all");

  const brand = consumer?.brand ?? user.brand;
  const previousSkus = useMemo(() => {
    if (!consumer) return new Set<string>();
    return new Set(
      purchases
        .filter((p) => p.consumerId === consumer.id)
        .flatMap((p) => p.lines.map((l) => l.sku)),
    );
  }, [purchases, consumer]);

  const allBrandProducts = PRODUCT_POOL.filter((p) => p.brand === brand);

  // Smart suggestions
  const suggestions = useMemo<{ p: Product; reason: string }[]>(() => {
    if (!consumer) return [];
    const out: { p: Product; reason: string }[] = [];

    // 1. Replenishment: products bought 30-90 days ago
    const now = Date.now();
    purchases
      .filter((p) => p.consumerId === consumer.id)
      .forEach((p) => {
        const days = (now - new Date(p.date).getTime()) / 86400000;
        if (days >= 30 && days <= 90) {
          p.lines.forEach((l) => {
              const prod = PRODUCT_POOL.find((x) => x.sku === l.sku);
            if (prod && !out.some((o) => o.p.sku === prod.sku)) {
              out.push({ p: prod, reason: "Reposición sugerida" });
            }
          });
        }
      });

    // 2. Skincare match by concerns
    consumer.skinConcerns.forEach((c) => {
      allBrandProducts
        .filter((p) => p.category === "Skincare" && p.benefits.includes(c) && !previousSkus.has(p.sku))
        .forEach((p) => {
          if (!out.some((o) => o.p.sku === p.sku)) out.push({ p, reason: `Para ${c.toLowerCase()}` });
        });
    });

    // 3. Interests
    consumer.interests.forEach((i) => {
      const cat = i === "Skincare" ? "Skincare" : i === "Makeup" ? "Makeup" : "Fragancia";
      allBrandProducts
        .filter((p) => p.category === cat && !previousSkus.has(p.sku))
        .slice(0, 1)
        .forEach((p) => {
          if (!out.some((o) => o.p.sku === p.sku)) out.push({ p, reason: `Le interesa ${i}` });
        });
    });

    // 4. fill with brand bestsellers
    allBrandProducts
      .filter((p) => !previousSkus.has(p.sku) && !out.some((o) => o.p.sku === p.sku))
      .slice(0, 6)
      .forEach((p) => out.push({ p, reason: "Best-seller" }));

    return out.slice(0, 6);
  }, [consumer, purchases, allBrandProducts, previousSkus]);

  const catalog = useMemo(
    () =>
      allBrandProducts
        .filter((p) => (filterCat === "all" ? true : p.category === filterCat))
        .filter((p) =>
          search.trim()
            ? p.name.toLowerCase().includes(search.toLowerCase()) ||
              p.sku.toLowerCase().includes(search.toLowerCase())
            : true,
        ),
    [allBrandProducts, search, filterCat],
  );

  const toggle = (p: Product) => {
    setSelected((prev) =>
      prev.some((x) => x.sku === p.sku)
        ? prev.filter((x) => x.sku !== p.sku)
        : [...prev, p],
    );
  };

  const isSelected = (sku: string) => selected.some((s) => s.sku === sku);

  const save = () => {
    if (!consumer) return toast.error("Selecciona una consumidora");
    if (selected.length === 0) return toast.error("Agrega al menos un producto");
    const r: Recommendation = {
      id: `r-${Date.now()}`,
      consumerId: consumer.id,
      baId: user.id,
      date: new Date().toISOString(),
      products: selected.map((p) => ({ sku: p.sku, name: p.name })),
      notes: notes || undefined,
      converted: false,
    };
    addRecommendation(r);
    toast.success("Recomendación guardada");
    setLookbookOpen(true);
  };

  const lookbookText = useMemo(() => {
    if (!consumer) return "";
    const brandName = brand === "ysl" ? "YSL Beauty" : "Lancôme";
    return [
      `Hola ${consumer.firstName}, soy ${user.name.split(" ")[0]} de ${brandName}.`,
      ``,
      `Te comparto mi selección personalizada para ti${reason !== "Conocer productos" ? ` (${reason.toLowerCase()})` : ""}:`,
      ``,
      ...selected.map((p) => `• ${p.name} — ${formatMoneyShort(p.price)}`),
      ``,
      notes ? `📝 ${notes}` : "",
      ``,
      `Cualquier duda, aquí estoy. ¡Te espero en el counter! ✨`,
    ]
      .filter(Boolean)
      .join("\n");
  }, [consumer, selected, reason, notes, user, brand]);

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      <PageHeader
        eyebrow="Motor de recomendación"
        title="Recomendaciones"
        description="Diseña una selección personalizada en menos de 3 toques."
      />

      {/* Step 1 — Consumer + reason */}
      <Card className="p-6 lg:p-8 shadow-card space-y-6">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
              Paso 1 · Consumidora
            </p>
            <ConsumerPicker brand={user.brand} value={consumer} onChange={setConsumer} />
            {consumer && (
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <Pill label="Tipo de piel" value={consumer.skinType ?? "—"} />
                <Pill label="Rutina" value={consumer.routine ?? "—"} />
                <Pill label="Intereses" value={consumer.interests.join(", ") || "—"} />
              </div>
            )}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
              Paso 2 · Motivo de visita
            </p>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs border transition",
                    reason === r
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Step 3 — Smart suggestions */}
      {consumer && (
        <section className="space-y-3 animate-fade-in">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
                Paso 3 · Sugerencias inteligentes
              </p>
              <h2 className="font-display text-2xl flex items-center gap-2">
                <Sparkles className="size-5 text-primary" /> Para {consumer.firstName}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Basado en perfil, historial y reposición
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {suggestions.map(({ p, reason: r }) => (
              <ProductCard
                key={p.sku}
                product={p}
                compact
                badge={r}
                selected={isSelected(p.sku)}
                onClick={() => toggle(p)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Step 4 — Catalog */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
              Paso 4 · Catálogo completo
            </p>
            <h2 className="font-display text-2xl">Buscar y agregar</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setScanOpen(true)}>
              <ScanLine className="size-4 mr-1.5" /> Escanear SKU
            </Button>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, SKU o ingrediente…"
            className="h-11 flex-1 min-w-[220px]"
          />
          <div className="flex gap-1">
            {(["all", "Skincare", "Makeup", "Fragancia"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setFilterCat(c)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs border",
                  filterCat === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/40",
                )}
              >
                {c === "all" ? "Todos" : c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {catalog.map((p) => (
            <ProductCard
              key={p.sku}
              product={p}
              selected={isSelected(p.sku)}
              onClick={() => toggle(p)}
            />
          ))}
        </div>
      </section>

      {/* Step 5 — Lookbook */}
      <Card className="p-6 lg:p-8 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
              Paso 5 · Lookbook
            </p>
            <h2 className="font-display text-2xl">Selección personalizada</h2>
          </div>
          <span className="text-sm text-muted-foreground">
            {selected.length} producto{selected.length === 1 ? "" : "s"}
          </span>
        </div>

        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Agrega productos desde sugerencias o catálogo.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {selected.map((p) => (
              <div key={p.sku} className="relative">
                <ProductCard product={p} compact />
                <button
                  type="button"
                  onClick={() => toggle(p)}
                  className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas para la consumidora (opcional)…"
          className="mt-5 min-h-[80px]"
        />

        <div className="flex flex-wrap items-center gap-2 mt-5 justify-end">
          {consumer && (
            <Button asChild variant="ghost">
              <Link to={`/consumidoras/${consumer.id}`}>Ver perfil</Link>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setLookbookOpen(true)}
            disabled={!consumer || selected.length === 0}
          >
            Vista previa lookbook
          </Button>
          <Button
            size="lg"
            onClick={save}
            disabled={!consumer || selected.length === 0}
          >
            Guardar recomendación
          </Button>
        </div>
      </Card>

      <ScanDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onPick={(p) => {
          toggle(p);
          setScanOpen(false);
        }}
      />

      <LookbookDialog
        open={lookbookOpen}
        onOpenChange={setLookbookOpen}
        consumer={consumer}
        products={selected}
        text={lookbookText}
        onSent={() => {
          if (!consumer) return;
          addMessage({
            id: `m-${Date.now()}`,
            consumerId: consumer.id,
            baId: user.id,
            date: new Date().toISOString(),
            templateType: "Lookbook personalizado",
            content: lookbookText,
            channel: "WhatsApp",
          });
        }}
      />
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}

function formatMoneyShort(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

function ScanDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onPick: (p: Product) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Escáner SKU (cámara)</DialogTitle>
        </DialogHeader>
        <BarcodeScanner
          onClose={() => onOpenChange(false)}
          onDetect={(code) => {
            const found = SEED_PRODUCTS.find(
              (p) => p.sku.toLowerCase() === code.toLowerCase(),
            );
            if (found) {
              onPick(found);
            } else {
              toast.error(`SKU no reconocido: ${code}`);
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function LookbookDialog({
  open,
  onOpenChange,
  consumer,
  products,
  text,
  onSent,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  consumer: Consumer | null;
  products: Product[];
  text: string;
  onSent: () => void;
}) {
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
    onSent();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Lookbook</DialogTitle>
        </DialogHeader>
        {consumer && (
          <div className="rounded-xl gradient-soft p-6 border border-border">
            <div className="flex items-center gap-3">
              <ConsumerAvatar firstName={consumer.firstName} lastName={consumer.lastName} size={48} />
              <div>
                <p className="font-display text-lg">{fullName(consumer.firstName, consumer.lastName)}</p>
                <p className="text-xs text-muted-foreground">Selección personalizada</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {products.slice(0, 6).map((p) => (
                <div key={p.sku}>
                  <ProductCard product={p} compact />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="rounded-md border border-border bg-muted/30 p-4 text-sm whitespace-pre-line max-h-48 overflow-y-auto">
          {text}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <Check className="size-4 mr-1.5" /> Cerrar
          </Button>
          <Button onClick={copy}>
            <Copy className="size-4 mr-1.5" /> Copiar para WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
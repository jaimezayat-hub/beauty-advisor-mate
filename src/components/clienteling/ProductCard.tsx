import type { Product } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Sparkle, Info, PlayCircle, Beaker, BookOpen, MessageSquareQuote } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ProductCard({
  product,
  selected,
  compact,
  badge,
  actions,
  onClick,
  showInfo = true,
}: {
  product: Product;
  selected?: boolean;
  compact?: boolean;
  badge?: string;
  actions?: React.ReactNode;
  onClick?: () => void;
  showInfo?: boolean;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const Tag: keyof JSX.IntrinsicElements = onClick ? "button" : "div";
  return (
    <>
    <Tag
      onClick={onClick}
      className={cn(
        "group text-left rounded-xl border overflow-hidden transition-all bg-card",
        selected ? "border-primary ring-2 ring-primary/20 shadow-luxe" : "border-border hover:border-primary/40 hover:shadow-card",
        onClick && "cursor-pointer",
      )}
    >
      <div
        className={cn("relative overflow-hidden", compact ? "h-24" : "h-36")}
        style={{
          background: `linear-gradient(135deg, hsl(${product.imageHue} 55% 80%), hsl(${product.imageHue} 35% 55%))`,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-white/90">
          <span className="font-display italic text-xl tracking-wide drop-shadow">
            {product.brand === "ysl" ? "YSL" : "Lancôme"}
          </span>
        </div>
        {badge && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest bg-background/90 text-foreground px-2 py-0.5 rounded-full">
            <Sparkle className="size-2.5" /> {badge}
          </span>
        )}
        {!product.inStock && (
          <span className="absolute top-2 right-2 text-[10px] uppercase tracking-widest bg-warning/20 text-warning px-2 py-0.5 rounded-full">
            Pedido
          </span>
        )}
        {showInfo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setInfoOpen(true);
            }}
            aria-label="Ver ficha técnica"
            className="absolute bottom-2 right-2 size-7 rounded-full bg-background/90 hover:bg-background text-foreground flex items-center justify-center shadow"
          >
            <Info className="size-3.5" />
          </button>
        )}
      </div>
      <div className={cn("p-3", compact && "p-2.5")}>
        <p className={cn("font-medium leading-tight line-clamp-2", compact ? "text-xs" : "text-sm")}>
          {product.name}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {product.category}
          </span>
          <span className={cn("font-display", compact ? "text-sm" : "text-base")}>
            {formatMoney(product.price)}
          </span>
        </div>
        {actions && <div className="mt-3 flex gap-1.5">{actions}</div>}
      </div>
    </Tag>
    <ProductInfoDialog product={product} open={infoOpen} onOpenChange={setInfoOpen} />
    </>
  );
}

function ProductInfoDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const ingredients = product.ingredients ?? deriveIngredients(product);
  const howTo = product.howToUse ?? deriveHowToUse(product);
  const args = product.saleArguments ?? deriveSaleArguments(product);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{product.name}</DialogTitle>
        </DialogHeader>
        <div
          className="h-32 rounded-lg"
          style={{
            background: `linear-gradient(135deg, hsl(${product.imageHue} 55% 80%), hsl(${product.imageHue} 35% 55%))`,
          }}
        />
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-md border border-border p-3">
            <p className="uppercase tracking-widest text-muted-foreground text-[10px]">SKU</p>
            <p className="font-medium mt-1">{product.sku}</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="uppercase tracking-widest text-muted-foreground text-[10px]">Categoría</p>
            <p className="font-medium mt-1">{product.category}</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="uppercase tracking-widest text-muted-foreground text-[10px]">Precio</p>
            <p className="font-display mt-1">{formatMoney(product.price)}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{product.description}</p>
        <Section icon={<Beaker className="size-4 text-primary" />} title="Ingredientes clave">
          <div className="flex flex-wrap gap-1.5">
            {ingredients.map((i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-muted">{i}</span>
            ))}
          </div>
        </Section>
        <Section icon={<BookOpen className="size-4 text-primary" />} title="Modo de uso">
          <p className="text-sm leading-relaxed">{howTo}</p>
        </Section>
        <Section icon={<MessageSquareQuote className="size-4 text-primary" />} title="Argumentario de venta">
          <ul className="text-sm space-y-1.5 list-disc list-inside">
            {args.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </Section>
        {product.tutorialUrl && (
          <a
            href={product.tutorialUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <PlayCircle className="size-4" /> Ver tutorial
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{title}</p>
      </div>
      {children}
    </div>
  );
}

function deriveIngredients(p: Product): string[] {
  if (p.category === "Skincare") return ["Niacinamida", "Ácido Hialurónico", "Vitamina C", "Bífidus"];
  if (p.category === "Makeup") return ["Pigmentos minerales", "Vitamina E", "Aceites nutritivos"];
  return ["Acordes florales", "Notas amaderadas", "Almizcle blanco"];
}
function deriveHowToUse(p: Product): string {
  if (p.category === "Skincare") return "Aplicar mañana y noche sobre rostro y cuello limpios, antes de la crema. Masajear con movimientos ascendentes hasta absorción.";
  if (p.category === "Makeup") return "Preparar la piel con sérum y crema. Aplicar con brocha o esponja húmeda desde el centro hacia afuera. Retocar al cabo del día.";
  return "Pulverizar en puntos de pulso (cuello, muñecas, detrás de las orejas) a 20 cm de distancia. Reaplicar tras 6 horas si se desea.";
}
function deriveSaleArguments(p: Product): string[] {
  return [
    `Beneficios visibles: ${p.benefits.slice(0, 3).join(", ")}.`,
    "Fórmula validada clínicamente — resultados desde la primera semana.",
    p.brand === "ysl" ? "Firma YSL: lujo audaz, performance y confort." : "Herencia Lancôme: ciencia y elegancia francesa.",
    "Ideal para sumar al ritual y elevar el ticket promedio.",
  ];
}
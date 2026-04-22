import type { Product } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Sparkle } from "lucide-react";

export function ProductCard({
  product,
  selected,
  compact,
  badge,
  actions,
  onClick,
}: {
  product: Product;
  selected?: boolean;
  compact?: boolean;
  badge?: string;
  actions?: React.ReactNode;
  onClick?: () => void;
}) {
  const Tag: keyof JSX.IntrinsicElements = onClick ? "button" : "div";
  return (
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
  );
}
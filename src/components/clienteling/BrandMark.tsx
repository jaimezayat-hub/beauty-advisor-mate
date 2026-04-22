import { cn } from "@/lib/utils";
import type { Brand } from "@/lib/types";

interface Props {
  brand: Brand;
  variant?: "default" | "stacked" | "mono";
  className?: string;
}

export function BrandMark({ brand, variant = "default", className }: Props) {
  if (brand === "ysl") {
    return (
      <div className={cn("flex flex-col items-start leading-none font-display", className)}>
        <span className="text-[1.6em] tracking-[0.18em] font-semibold">YSL</span>
        <span className="text-[0.55em] tracking-[0.42em] uppercase mt-1 opacity-80">
          Beauty
        </span>
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col items-start leading-tight", className)}>
      <span className="font-display italic text-[1.4em] tracking-tight">
        Lancôme
      </span>
      {variant !== "mono" && (
        <span className="text-[0.45em] tracking-[0.45em] uppercase opacity-70 mt-0.5">
          Paris
        </span>
      )}
    </div>
  );
}
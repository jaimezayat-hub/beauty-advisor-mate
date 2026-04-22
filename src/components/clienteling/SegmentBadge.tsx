import { cn } from "@/lib/utils";
import type { Segment } from "@/lib/types";

const STYLES: Record<Segment, { label: string; className: string }> = {
  VIP: {
    label: "VIP",
    className: "bg-gold/15 text-gold border-gold/40",
  },
  Recurrente: {
    label: "Recurrente",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  Nueva: {
    label: "Nueva",
    className: "bg-success/15 text-success border-success/40",
  },
  EnRiesgo: {
    label: "En Riesgo",
    className: "bg-destructive/10 text-destructive border-destructive/40",
  },
};

export function SegmentBadge({
  segment,
  className,
  size = "md",
}: {
  segment: Segment;
  className?: string;
  size?: "sm" | "md";
}) {
  const s = STYLES[segment];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium tracking-wide uppercase",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        s.className,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}
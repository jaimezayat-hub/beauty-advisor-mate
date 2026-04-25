import { cn } from "@/lib/utils";
import type { Segment } from "@/lib/types";

const STYLES: Record<Segment, { label: string; className: string }> = {
  VIP: {
    label: "VIP",
    className: "bg-[hsl(var(--segment-vip-bg))] text-[hsl(var(--segment-vip-text))] border-[hsl(var(--segment-vip-border))]",
  },
  Recurrente: {
    label: "Recurrente",
    className: "bg-[hsl(var(--segment-recurrent-bg))] text-[hsl(var(--segment-recurrent-text))] border-[hsl(var(--segment-recurrent-border))]",
  },
  Nueva: {
    label: "Nueva",
    className: "bg-[hsl(var(--segment-new-bg))] text-[hsl(var(--segment-new-text))] border-[hsl(var(--segment-new-border))]",
  },
  EnRiesgo: {
    label: "En Riesgo",
    className: "bg-[hsl(var(--segment-risk-bg))] text-[hsl(var(--segment-risk-text))] border-[hsl(var(--segment-risk-border))]",
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
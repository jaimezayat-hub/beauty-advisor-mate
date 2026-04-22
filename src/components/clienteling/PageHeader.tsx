import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-border", className)}>
      <div>
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-4xl text-balance">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1.5 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  label: string;
  hint: string;
}

interface Props {
  steps: readonly Step[];
  current: number;
  onSelect?: (id: 1 | 2 | 3) => void;
}

export function OnboardingStepper({ steps, current, onSelect }: Props) {
  const progress = ((current - 1) / (steps.length - 1)) * 100;

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
        <ol className="relative flex justify-between">
          {steps.map((s) => {
            const done = s.id < current;
            const active = s.id === current;
            return (
              <li key={s.id} className="flex flex-col items-center text-center w-1/3">
                <button
                  type="button"
                  onClick={() => onSelect?.(s.id as 1 | 2 | 3)}
                  className={cn(
                    "size-10 rounded-full grid place-items-center text-sm font-medium transition border-2",
                    done && "bg-primary text-primary-foreground border-primary",
                    active &&
                      "bg-background text-primary border-primary ring-4 ring-primary/15",
                    !done && !active && "bg-background text-muted-foreground border-border",
                    "cursor-pointer hover:scale-105",
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? <Check className="size-4" /> : s.id}
                </button>
                <p
                  className={cn(
                    "mt-2 text-xs font-medium uppercase tracking-widest",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </p>
                <p className="text-[11px] text-muted-foreground hidden sm:block">
                  {s.hint}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
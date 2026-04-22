import { Label } from "@/components/ui/label";

interface Props {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, hint, error, required, children }: Props) {
  return (
    <div>
      <Label className="mb-2 flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive mt-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

interface ChipsProps<T extends string> {
  options: readonly T[];
  value: T[];
  onChange: (next: T[]) => void;
  multi?: boolean;
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  multi = true,
}: ChipsProps<T>) {
  const toggle = (o: T) => {
    if (!multi) return onChange([o]);
    onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className={
              "px-3.5 py-2 rounded-full text-sm border transition " +
              (selected
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "border-border hover:border-primary/40 bg-background")
            }
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

interface SingleProps<T extends string> {
  options: readonly T[];
  value: T | "";
  onChange: (next: T | "") => void;
}

export function SingleSelect<T extends string>({ options, value, onChange }: SingleProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(selected ? "" : o)}
            className={
              "px-3.5 py-2 rounded-full text-sm border transition " +
              (selected
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "border-border hover:border-primary/40 bg-background")
            }
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  tone?: "default" | "destructive";
}

export function TagInput({ value, onChange, placeholder, tone = "default" }: TagInputProps) {
  const add = (raw: string) => {
    const v = raw.trim();
    if (!v || value.includes(v) || value.length >= 12) return;
    onChange([...value, v]);
  };
  return (
    <div
      className={
        "min-h-11 rounded-md border border-input bg-background px-2.5 py-2 flex flex-wrap gap-1.5 items-center focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      }
    >
      {value.map((t) => (
        <span
          key={t}
          className={
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs " +
            (tone === "destructive"
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary")
          }
        >
          {t}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== t))}
            className="ml-0.5 opacity-70 hover:opacity-100"
            aria-label={`Quitar ${t}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1"
        placeholder={value.length >= 12 ? "Máximo alcanzado" : placeholder}
        disabled={value.length >= 12}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).value = "";
          } else if (e.key === "Backspace" && !(e.target as HTMLInputElement).value) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={(e) => {
          if (e.target.value) {
            add(e.target.value);
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}
import { useMemo, useState } from "react";
import { useApp } from "@/store/useApp";
import { Input } from "@/components/ui/input";
import { ConsumerAvatar } from "./Avatar";
import { SegmentBadge } from "./SegmentBadge";
import { fullName } from "@/lib/format";
import type { Consumer } from "@/lib/types";
import { Search, X } from "lucide-react";

export function ConsumerPicker({
  brand,
  value,
  onChange,
  placeholder = "Buscar consumidora…",
}: {
  brand?: "lancome" | "ysl";
  value: Consumer | null;
  onChange: (c: Consumer | null) => void;
  placeholder?: string;
}) {
  const consumers = useApp((s) => s.consumers);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const t = q.toLowerCase().trim();
    let l = brand ? consumers.filter((c) => c.brand === brand) : consumers;
    if (t) {
      l = l.filter(
        (c) =>
          fullName(c.firstName, c.lastName).toLowerCase().includes(t) ||
          c.email.toLowerCase().includes(t) ||
          c.phone.includes(t.replace(/\D/g, "")),
      );
    }
    return l.slice(0, 8);
  }, [consumers, q, brand]);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/30">
        <ConsumerAvatar firstName={value.firstName} lastName={value.lastName} size={40} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{fullName(value.firstName, value.lastName)}</p>
          <p className="text-xs text-muted-foreground truncate">{value.email}</p>
        </div>
        <SegmentBadge segment={value.segment} size="sm" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="h-11 pl-10"
      />
      {open && q.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover shadow-luxe overflow-hidden animate-fade-in">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              Sin resultados.
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(c);
                      setQ("");
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 text-left transition"
                  >
                    <ConsumerAvatar firstName={c.firstName} lastName={c.lastName} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fullName(c.firstName, c.lastName)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                    <SegmentBadge segment={c.segment} size="sm" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
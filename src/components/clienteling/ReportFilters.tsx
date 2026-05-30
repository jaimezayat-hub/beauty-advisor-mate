import { useMemo } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Brand, Store, User } from "@/lib/types";
import type { Scope } from "@/lib/permissions";

export type RangePreset = "hoy" | "7d" | "mes" | "trimestre" | "ano" | "custom";

export interface ReportFiltersValue {
  preset: RangePreset;
  from: Date;
  to: Date;
  brand: Brand | "all";
  chain: "palacio" | "liverpool" | "all";
  region: string | "all";
  storeId: string | "all";
  baId: string | "all";
}

export function presetRange(p: RangePreset, now = new Date()): { from: Date; to: Date } {
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  if (p === "hoy") return { from, to };
  if (p === "7d") {
    from.setDate(from.getDate() - 6);
    return { from, to };
  }
  if (p === "mes") {
    from.setDate(1);
    return { from, to };
  }
  if (p === "trimestre") {
    from.setMonth(from.getMonth() - 3);
    return { from, to };
  }
  if (p === "ano") {
    from.setMonth(0, 1);
    return { from, to };
  }
  return { from, to };
}

export function defaultFilters(): ReportFiltersValue {
  const { from, to } = presetRange("mes");
  return {
    preset: "mes",
    from,
    to,
    brand: "all",
    chain: "all",
    region: "all",
    storeId: "all",
    baId: "all",
  };
}

interface Props {
  value: ReportFiltersValue;
  onChange: (next: ReportFiltersValue) => void;
  stores: Store[];
  users: User[];
  regions: string[];
  scope: Scope;
}

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "mes", label: "Mes" },
  { key: "trimestre", label: "Trimestre" },
  { key: "ano", label: "Año" },
];

export function ReportFilters({ value, onChange, stores, users, regions, scope }: Props) {
  const filteredStores = useMemo(() => {
    let s = stores;
    if (scope.kind === "store") s = s.filter((x) => x.id === scope.storeId);
    if (scope.kind === "region") s = s.filter((x) => x.region === scope.region);
    if (value.chain !== "all") s = s.filter((x) => x.chain === value.chain);
    if (value.region !== "all") s = s.filter((x) => x.region === value.region);
    if (value.brand !== "all") s = s.filter((x) => x.brands.includes(value.brand as Brand));
    return s;
  }, [stores, scope, value.chain, value.region, value.brand]);

  const filteredBAs = useMemo(() => {
    let bas = users.filter((u) => u.role === "ba");
    if (scope.kind === "self") bas = bas.filter((u) => u.id === scope.userId);
    if (scope.kind === "store") bas = bas.filter((u) => u.storeId === scope.storeId);
    if (scope.kind === "region")
      bas = bas.filter((u) => stores.find((s) => s.id === u.storeId)?.region === scope.region);
    if (value.storeId !== "all") bas = bas.filter((u) => u.storeId === value.storeId);
    if (value.brand !== "all") bas = bas.filter((u) => u.brand === value.brand);
    return bas;
  }, [users, stores, scope, value.storeId, value.brand]);

  const filteredRegions = useMemo(() => {
    if (scope.kind === "region") return [scope.region];
    if (scope.kind === "store") {
      const r = stores.find((s) => s.id === scope.storeId)?.region;
      return r ? [r] : regions;
    }
    return regions;
  }, [regions, stores, scope]);

  const applyPreset = (p: RangePreset) => {
    if (p === "custom") {
      onChange({ ...value, preset: "custom" });
      return;
    }
    const { from, to } = presetRange(p);
    onChange({ ...value, preset: p, from, to });
  };

  const isFiltered =
    value.brand !== "all" ||
    value.chain !== "all" ||
    value.region !== "all" ||
    value.storeId !== "all" ||
    value.baId !== "all" ||
    value.preset !== "mes";

  return (
    <div className="sticky top-0 z-20 -mx-8 lg:-mx-12 px-8 lg:px-12 py-3 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        {/* presets */}
        <div className="flex bg-muted rounded-lg p-0.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={cn(
                "px-2.5 py-1.5 text-xs uppercase tracking-widest rounded-md transition",
                value.preset === p.key
                  ? "bg-background shadow-sm font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* custom range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-8 gap-1.5", value.preset === "custom" && "border-primary")}
            >
              <CalendarIcon className="size-3.5" />
              {format(value.from, "dd MMM")} – {format(value.to, "dd MMM")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: value.from, to: value.to }}
              onSelect={(r) => {
                if (r?.from && r?.to) onChange({ ...value, preset: "custom", from: r.from, to: r.to });
              }}
              numberOfMonths={2}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <Separator />

        {/* brand */}
        <FilterSelect
          label="Marca"
          value={value.brand}
          onChange={(v) => onChange({ ...value, brand: v as any, storeId: "all", baId: "all" })}
          options={[
            { value: "all", label: "Todas las marcas" },
            { value: "lancome", label: "Lancôme" },
            { value: "ysl", label: "YSL" },
          ]}
        />
        {/* chain */}
        <FilterSelect
          label="Cadena"
          value={value.chain}
          onChange={(v) => onChange({ ...value, chain: v as any, storeId: "all", baId: "all" })}
          options={[
            { value: "all", label: "Todas" },
            { value: "palacio", label: "Palacio" },
            { value: "liverpool", label: "Liverpool" },
          ]}
        />
        {/* region */}
        <FilterSelect
          label="Región"
          value={value.region}
          onChange={(v) => onChange({ ...value, region: v as any, storeId: "all", baId: "all" })}
          options={[
            { value: "all", label: "Todas las regiones" },
            ...filteredRegions.map((r) => ({ value: r, label: r })),
          ]}
          disabled={scope.kind === "region" || scope.kind === "store"}
        />
        {/* store */}
        <FilterSelect
          label="Tienda"
          value={value.storeId}
          onChange={(v) => onChange({ ...value, storeId: v as any, baId: "all" })}
          options={[
            { value: "all", label: "Todas las tiendas" },
            ...filteredStores.map((s) => ({ value: s.id, label: s.name })),
          ]}
          disabled={scope.kind === "store"}
        />
        {/* BA */}
        <FilterSelect
          label="BA"
          value={value.baId}
          onChange={(v) => onChange({ ...value, baId: v as any })}
          options={[
            { value: "all", label: "Todos los BAs" },
            ...filteredBAs.map((b) => ({ value: b.id, label: b.name })),
          ]}
          disabled={scope.kind === "self"}
        />

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-muted-foreground"
            onClick={() => onChange(defaultFilters())}
          >
            <X className="size-3.5" /> Limpiar
          </Button>
        )}
      </div>
    </div>
  );
}

function Separator() {
  return <div className="hidden md:block h-6 w-px bg-border mx-1" />;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-8 w-[170px] text-xs">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
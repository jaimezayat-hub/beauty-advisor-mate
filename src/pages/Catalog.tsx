import { useMemo, useState } from "react";
import { useApp, useCurrentUser } from "@/store/useApp";
import { PageHeader } from "@/components/clienteling/PageHeader";
import { ProductCard } from "@/components/clienteling/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useProductsList } from "@/lib/db/useProducts";
import { SEED_PRODUCTS } from "@/data/seed";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { Search, SlidersHorizontal, X } from "lucide-react";

type Cat = Product["category"] | "Maquillaje" | "Fragancias";

const COLOR_BUCKETS: { label: string; hex: string; range: [number, number][] }[] = [
  { label: "Nude", hex: "#d8b89a", range: [[20, 45]] },
  { label: "Rosa", hex: "#e8a0b8", range: [[320, 360], [0, 15]] },
  { label: "Coral", hex: "#ef6c5a", range: [[5, 20]] },
  { label: "Rojo", hex: "#c0303d", range: [[350, 360], [0, 8]] },
  { label: "Borgoña", hex: "#7a2638", range: [[330, 355]] },
  { label: "Tierra", hex: "#8b5a3c", range: [[25, 50]] },
  { label: "Dorado", hex: "#d4a44a", range: [[40, 60]] },
  { label: "Verde", hex: "#6e9b6a", range: [[80, 160]] },
  { label: "Azul", hex: "#5b7fb5", range: [[180, 260]] },
  { label: "Violeta", hex: "#8a6bb1", range: [[260, 320]] },
];

function colorOf(p: Product): string {
  const h = ((p.imageHue % 360) + 360) % 360;
  for (const c of COLOR_BUCKETS) {
    if (c.range.some(([a, b]) => h >= a && h <= b)) return c.label;
  }
  return "Neutro";
}

function materialOf(p: Product): string {
  const sc = (p.subcategory ?? "").toLowerCase();
  if (sc.includes("mascara") || sc.includes("delineador") || sc.includes("gloss") || sc.includes("labial")) return "Líquido";
  if (sc.includes("sombra") || sc.includes("rubor") || sc.includes("iluminador")) return "Polvo";
  if (sc.includes("base") || sc.includes("corrector") || sc.includes("primer")) return "Crema";
  if (p.category === "Fragancia") return "Spray";
  if (p.category === "Skincare") return sc.includes("limpieza") ? "Espuma" : "Crema/Sérum";
  return "Otro";
}

const CATEGORIES: { value: "all" | Product["category"]; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "Skincare", label: "Skincare" },
  { value: "Makeup", label: "Maquillaje" },
  { value: "Fragancia", label: "Fragancia" },
];

export default function Catalog() {
  const user = useCurrentUser()!;
  const { activeBrand, isRealSession } = useApp();
  const dbProducts = useProductsList(activeBrand, isRealSession);
  const pool: Product[] = isRealSession && dbProducts.data?.length
    ? dbProducts.data
    : SEED_PRODUCTS.filter((p) => p.brand === activeBrand);

  const priceMax = useMemo(
    () => Math.max(2000, ...pool.map((p) => Math.ceil(p.price / 100) * 100)),
    [pool],
  );

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | Product["category"]>("all");
  const [subcats, setSubcats] = useState<Set<string>>(new Set());
  const [colors, setColors] = useState<Set<string>>(new Set());
  const [materials, setMaterials] = useState<Set<string>>(new Set());
  const [priceRange, setPriceRange] = useState<[number, number]>([0, priceMax]);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // derive option lists from current pool + category filter
  const inCategory = useMemo(
    () => pool.filter((p) => category === "all" || p.category === category),
    [pool, category],
  );

  const subcatOptions = useMemo(() => {
    const s = new Set<string>();
    inCategory.forEach((p) => p.subcategory && s.add(p.subcategory));
    return Array.from(s).sort();
  }, [inCategory]);

  const colorOptions = useMemo(() => {
    const s = new Set<string>();
    inCategory.forEach((p) => s.add(colorOf(p)));
    return COLOR_BUCKETS.filter((c) => s.has(c.label));
  }, [inCategory]);

  const materialOptions = useMemo(() => {
    const s = new Set<string>();
    inCategory.forEach((p) => s.add(materialOf(p)));
    return Array.from(s).sort();
  }, [inCategory]);

  const filtered = useMemo(() => {
    return inCategory.filter((p) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.sku.toLowerCase().includes(q) &&
          !(p.subcategory ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      if (subcats.size && (!p.subcategory || !subcats.has(p.subcategory))) return false;
      if (colors.size && !colors.has(colorOf(p))) return false;
      if (materials.size && !materials.has(materialOf(p))) return false;
      if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
      if (onlyAvailable && !p.inStock) return false;
      return true;
    });
  }, [inCategory, search, subcats, colors, materials, priceRange, onlyAvailable]);

  const toggleSet = (setter: typeof setSubcats, value: string) =>
    setter((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });

  const clearAll = () => {
    setSearch("");
    setCategory("all");
    setSubcats(new Set());
    setColors(new Set());
    setMaterials(new Set());
    setPriceRange([0, priceMax]);
    setOnlyAvailable(false);
  };

  const activeFilterCount =
    (category !== "all" ? 1 : 0) +
    subcats.size +
    colors.size +
    materials.size +
    (priceRange[0] > 0 || priceRange[1] < priceMax ? 1 : 0) +
    (onlyAvailable ? 1 : 0);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <PageHeader
        eyebrow="Catálogo"
        title="Catálogo de productos"
        description={`${pool.length} productos · ${activeBrand === "ysl" ? "YSL Beauty" : "Lancôme"}`}
      />

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Filters */}
        <aside className="space-y-5">
          <Card className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-primary" />
                <h3 className="font-display text-lg">Filtros</h3>
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
                  <X className="size-3 mr-1" /> Limpiar
                </Button>
              )}
            </div>

            <FilterGroup label="Categoría">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => {
                      setCategory(c.value);
                      setSubcats(new Set());
                      setColors(new Set());
                      setMaterials(new Set());
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs border transition",
                      category === c.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </FilterGroup>

            {subcatOptions.length > 0 && (
              <FilterGroup label="Tipo de producto">
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {subcatOptions.map((s) => (
                    <CheckRow
                      key={s}
                      label={s}
                      checked={subcats.has(s)}
                      onChange={() => toggleSet(setSubcats, s)}
                    />
                  ))}
                </div>
              </FilterGroup>
            )}

            {colorOptions.length > 0 && (
              <FilterGroup label="Color">
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((c) => {
                    const active = colors.has(c.label);
                    return (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => toggleSet(setColors, c.label)}
                        title={c.label}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs transition",
                          active
                            ? "border-primary ring-1 ring-primary/30"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <span
                          className="inline-block size-3.5 rounded-full border border-border"
                          style={{ background: c.hex }}
                        />
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </FilterGroup>
            )}

            {materialOptions.length > 0 && (
              <FilterGroup label="Material / Formato">
                <div className="flex flex-wrap gap-1.5">
                  {materialOptions.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleSet(setMaterials, m)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs border transition",
                        materials.has(m)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </FilterGroup>
            )}

            <FilterGroup label="Precio">
              <Slider
                min={0}
                max={priceMax}
                step={50}
                value={priceRange}
                onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
                className="mt-2"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                <span>{formatMoney(priceRange[0])}</span>
                <span>{formatMoney(priceRange[1])}</span>
              </div>
            </FilterGroup>

            <FilterGroup label="Disponibilidad">
              <CheckRow
                label="Sólo en stock"
                checked={onlyAvailable}
                onChange={() => setOnlyAvailable((v) => !v)}
              />
            </FilterGroup>
          </Card>
        </aside>

        {/* Results */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, SKU o tipo…"
                className="h-11 pl-9"
              />
            </div>
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
            </p>
          </div>

          {filtered.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              No hay productos que coincidan con los filtros.
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((p) => (
                <ProductCard key={p.sku} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground/90">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span className="truncate">{label}</span>
    </label>
  );
}
import { useMemo, useState } from "react";
import { useApp, useCurrentUser } from "@/store/useApp";
import { PageHeader } from "@/components/clienteling/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConsumerPicker } from "@/components/clienteling/ConsumerPicker";
import { ProductCard } from "@/components/clienteling/ProductCard";
import { Download, Minus, Plus, ScanLine, Search, ShoppingBag, Trash2 } from "lucide-react";
import type { Consumer, Product, Purchase } from "@/lib/types";
import { formatDate, formatMoney, fullName } from "@/lib/format";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadCSV } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { Link, useSearchParams } from "react-router-dom";
import { SEED_PRODUCTS } from "@/data/seed";
import { getScope, inScope } from "@/lib/permissions";
import { BarcodeScanner } from "@/components/clienteling/BarcodeScanner";
import { usePurchasesList, useCreatePurchase } from "@/lib/db/usePurchases";

type Line = { product: Product; qty: number };

export default function Purchases() {
  const user = useCurrentUser()!;
  const { consumers, purchases: seedPurchases, users, stores, addPurchase, isRealSession } = useApp();
  const PRODUCTS = SEED_PRODUCTS;

  const dbPurchases = usePurchasesList(
    { brand: user.role === "ba" ? user.brand : "all" },
    isRealSession,
  );
  const createPurchase = useCreatePurchase();
  const purchases = isRealSession ? (dbPurchases.data ?? []) : seedPurchases;

  const [params] = useSearchParams();
  const preConsumerId = params.get("consumerId");
  const [consumer, setConsumer] = useState<Consumer | null>(
    preConsumerId ? consumers.find((c) => c.id === preConsumerId) ?? null : null,
  );
  const [lines, setLines] = useState<Line[]>([]);
  const [ticket, setTicket] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scanOpen, setScanOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [historyFilter, setHistoryFilter] = useState({ from: "", to: "", baId: "all", brand: "all" });
  const [ticketFile, setTicketFile] = useState<File | null>(null);

  const brand = consumer?.brand ?? user.brand;
  const catalog = useMemo(
    () =>
      PRODUCTS.filter((p) => p.brand === brand).filter((p) =>
        search.trim()
          ? p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [PRODUCTS, brand, search],
  );

  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);

  const addProduct = (p: Product) => {
    setLines((prev) => {
      const ex = prev.find((l) => l.product.sku === p.sku);
      if (ex) return prev.map((l) => (l.product.sku === p.sku ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { product: p, qty: 1 }];
    });
    toast.success(`${p.name} agregado`);
  };

  const updateQty = (sku: string, delta: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.product.sku === sku ? { ...l, qty: Math.max(0, l.qty + delta) } : l))
        .filter((l) => l.qty > 0),
    );
  };

  const save = async () => {
    if (!consumer) return toast.error("Selecciona una consumidora");
    if (lines.length === 0) return toast.error("Agrega al menos un producto");
    const p: Purchase = {
      id: `p-${Date.now()}`,
      consumerId: consumer.id,
      baId: user.id,
      storeId: user.storeId,
      brand,
      date: new Date(date).toISOString(),
      lines: lines.map((l) => ({ sku: l.product.sku, name: l.product.name, qty: l.qty, price: l.product.price })),
      total,
      ticketNumber: ticket || undefined,
    };
    try {
      if (isRealSession) {
        await createPurchase.mutateAsync({ purchase: p, ticketFile });
      } else {
        addPurchase(p);
      }
      toast.success("Compra registrada", { description: formatMoney(total) });
      setLines([]);
      setTicket("");
      setTicketFile(null);
      setConsumer(null);
    } catch (e: any) {
      toast.error("No se pudo registrar la compra", { description: e?.message ?? String(e) });
    }
  };

  // History filtering
  const history = useMemo(() => {
    const baToStoreId = Object.fromEntries(users.map((u) => [u.id, u.storeId]));
    const storeIdToRegion = Object.fromEntries(stores.map((s) => [s.id, s.region]));
    const scope = getScope(user);
    const scoped = isRealSession
      ? purchases // RLS ya filtró
      : purchases.filter((p) => inScope(scope, p, { baToStoreId, storeIdToRegion }));
    return scoped
      .filter((p) => (historyFilter.brand === "all" ? true : p.brand === historyFilter.brand))
      .filter((p) => (historyFilter.baId === "all" ? true : p.baId === historyFilter.baId))
      .filter((p) => (historyFilter.from ? p.date >= historyFilter.from : true))
      .filter((p) => (historyFilter.to ? p.date <= historyFilter.to + "T23:59:59" : true))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [purchases, historyFilter, user, users, stores, isRealSession]);

  const exportHistory = () => {
    const rows = history.flatMap((p) => {
      const c = consumers.find((x) => x.id === p.consumerId);
      const ba = users.find((u) => u.id === p.baId);
      return p.lines.map((l) => ({
        Fecha: formatDate(p.date),
        Ticket: p.ticketNumber ?? "",
        Marca: p.brand === "ysl" ? "YSL" : "Lancôme",
        Consumidora: c ? fullName(c.firstName, c.lastName) : "",
        Producto: l.name,
        SKU: l.sku,
        Cantidad: l.qty,
        "Precio Unit": l.price,
        Subtotal: l.price * l.qty,
        BA: ba?.name ?? "",
      }));
    });
    downloadCSV(`compras_${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success("Exportado");
  };

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      <PageHeader
        eyebrow="Punto de venta clienteling"
        title="Compras"
        description="Registra tickets y consulta el historial de transacciones del counter."
        actions={
          <Button variant="outline" onClick={exportHistory}>
            <Download className="size-4 mr-1.5" /> Exportar CSV
          </Button>
        }
      />

      {/* Register */}
      <section className="grid lg:grid-cols-[1fr_360px] gap-6">
        <Card className="p-6 lg:p-8 shadow-card space-y-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
              Paso 1 · Consumidora
            </p>
            <ConsumerPicker brand={user.brand} value={consumer} onChange={setConsumer} />
          </div>

          <div className="hairline" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Paso 2 · Productos
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setScanOpen(true)}>
                  <ScanLine className="size-4 mr-1.5" /> Escanear SKU
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowCatalog((s) => !s)}>
                  <Search className="size-4 mr-1.5" /> {showCatalog ? "Ocultar catálogo" : "Buscar en catálogo"}
                </Button>
              </div>
            </div>

            {showCatalog && (
              <div className="mb-4 space-y-3 animate-fade-in">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o SKU…"
                  className="h-11"
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[320px] overflow-y-auto pr-1">
                  {catalog.map((p) => (
                    <ProductCard
                      key={p.sku}
                      product={p}
                      compact
                      onClick={() => addProduct(p)}
                    />
                  ))}
                </div>
              </div>
            )}

            {lines.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border p-10 text-center text-muted-foreground">
                <ShoppingBag className="size-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aún no has agregado productos.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                {lines.map((l) => (
                  <div key={l.product.sku} className="flex items-center gap-3 p-3">
                    <div
                      className="size-12 rounded-md shrink-0"
                      style={{
                        background: `linear-gradient(135deg, hsl(${l.product.imageHue} 55% 75%), hsl(${l.product.imageHue} 35% 50%))`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.product.sku} · {formatMoney(l.product.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="size-7 rounded-full border border-border hover:bg-muted flex items-center justify-center"
                        onClick={() => updateQty(l.product.sku, -1)}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{l.qty}</span>
                      <button
                        type="button"
                        className="size-7 rounded-full border border-border hover:bg-muted flex items-center justify-center"
                        onClick={() => updateQty(l.product.sku, +1)}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <p className="font-display text-base w-24 text-right">
                      {formatMoney(l.product.price * l.qty)}
                    </p>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => updateQty(l.product.sku, -l.qty)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hairline" />

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Número de ticket / nota</Label>
              <Input
                value={ticket}
                onChange={(e) => setTicket(e.target.value)}
                placeholder="TKT-00001"
                className="h-11 mt-2"
              />
            </div>
            <div>
              <Label>Fecha</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 mt-2"
              />
            </div>
          </div>
          <div>
            <Label>Foto del ticket (opcional)</Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setTicketFile(e.target.files?.[0] ?? null)}
              className="h-11 mt-2"
            />
            {ticketFile && (
              <p className="text-xs text-muted-foreground mt-1">
                {ticketFile.name} · {(ticketFile.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6 shadow-luxe gradient-soft sticky top-6 self-start">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Resumen
          </p>
          <h2 className="font-display text-2xl mt-1">Total a registrar</h2>
          <p className="font-display text-5xl mt-4 leading-none">{formatMoney(total)}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {lines.reduce((s, l) => s + l.qty, 0)} productos
          </p>

          <div className="hairline my-5" />

          <ul className="text-sm space-y-1.5">
            <Row label="Consumidora" value={consumer ? fullName(consumer.firstName, consumer.lastName) : "—"} />
            <Row label="BA" value={user.name} />
            <Row label="Marca" value={brand === "ysl" ? "YSL Beauty" : "Lancôme"} />
          </ul>

          <Button onClick={save} size="lg" className="w-full mt-6">
            Guardar compra
          </Button>
          {consumer && (
            <Button asChild variant="link" className="w-full mt-2 text-xs">
              <Link to={`/consumidoras/${consumer.id}`}>Ir al perfil 360°</Link>
            </Button>
          )}
        </Card>
      </section>

      {/* History */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
              Histórico
            </p>
            <h2 className="font-display text-2xl">Compras registradas</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              type="date"
              value={historyFilter.from}
              onChange={(e) => setHistoryFilter((f) => ({ ...f, from: e.target.value }))}
              className="h-10 w-40"
            />
            <Input
              type="date"
              value={historyFilter.to}
              onChange={(e) => setHistoryFilter((f) => ({ ...f, to: e.target.value }))}
              className="h-10 w-40"
            />
            <select
              value={historyFilter.brand}
              onChange={(e) => setHistoryFilter((f) => ({ ...f, brand: e.target.value }))}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Todas las marcas</option>
              <option value="lancome">Lancôme</option>
              <option value="ysl">YSL</option>
            </select>
          </div>
        </div>

        <Card className="overflow-hidden shadow-card">
          {history.length === 0 ? (
            <p className="p-12 text-center text-muted-foreground text-sm">
              Sin compras con esos criterios.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium">Consumidora</th>
                    <th className="text-left px-4 py-3 font-medium">Marca</th>
                    <th className="text-left px-4 py-3 font-medium">Productos</th>
                    <th className="text-right px-4 py-3 font-medium">Total</th>
                    <th className="text-left px-4 py-3 font-medium">BA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((p) => {
                    const c = consumers.find((x) => x.id === p.consumerId);
                    const ba = users.find((u) => u.id === p.baId);
                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition">
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.date)}</td>
                        <td className="px-4 py-3">
                          {c ? (
                            <Link
                              to={`/consumidoras/${c.id}`}
                              className="hover:underline"
                            >
                              {fullName(c.firstName, c.lastName)}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-xs uppercase tracking-widest",
                            p.brand === "ysl" ? "text-foreground" : "text-primary",
                          )}>
                            {p.brand === "ysl" ? "YSL" : "Lancôme"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.lines.reduce((s, l) => s + l.qty, 0)} ítems
                        </td>
                        <td className="px-4 py-3 text-right font-display">
                          {formatMoney(p.total)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {ba?.name.split(" ")[0] ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <ScanDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        products={catalog}
        onPick={(p) => {
          addProduct(p);
          setScanOpen(false);
        }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </li>
  );
}

function ScanDialog({
  open,
  onOpenChange,
  products,
  onPick,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  products: Product[];
  onPick: (p: Product) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Escáner de SKU (cámara)</DialogTitle>
        </DialogHeader>
        <BarcodeScanner
          onClose={() => onOpenChange(false)}
          onDetect={(code) => {
            const found = products.find(
              (p) => p.sku.toLowerCase() === code.toLowerCase(),
            );
            if (found) onPick(found);
            else toast.error(`SKU no reconocido: ${code}`);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useApp, useCurrentStore, useCurrentUser } from "@/store/useApp";
import { BrandMark } from "@/components/clienteling/BrandMark";
import {
  Calendar,
  ClipboardList,
  Cog,
  Home,
  LogOut,
  MessageCircle,
  PieChart,
  BarChart3,
  Search,
  ShoppingBag,
  Sparkles,
  Users,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { GlobalSearch } from "./GlobalSearch";
import { ROLE_LABEL, canAccessRoute, isManagerRole } from "@/lib/permissions";

const NAV = [
  { to: "/", label: "Inicio", icon: Home, end: true },
  { to: "/consumidoras", label: "Consumidoras", icon: Users },
  { to: "/recomendaciones", label: "Recomendaciones", icon: Sparkles },
  { to: "/compras", label: "Compras", icon: ShoppingBag },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/seguimiento", label: "Seguimiento", icon: MessageCircle },
  { to: "/desempeno", label: "Desempeño", icon: BarChart3, performance: true },
  { to: "/reportes", label: "Reportes", icon: PieChart },
  { to: "/configuracion", label: "Configuración", icon: Cog },
];

export function AppShell() {
  const user = useCurrentUser();
  const store = useCurrentStore();
  const { logout, activeBrand, setActiveBrand } = useApp();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const isManager = isManagerRole(user.role);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border relative">
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: "var(--gradient-brand)" }}
        />
        <div className="px-6 pt-7 pb-5">
          <BrandMark brand={activeBrand} className="text-2xl" />
          <p className="text-[10px] uppercase tracking-[0.3em] mt-2 opacity-60">
            Luxe Clienteling
          </p>
        </div>

        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2 rounded-lg bg-sidebar-accent/60 hover:bg-sidebar-accent px-3 py-2.5 text-sm transition"
          >
            <Search className="size-4 opacity-70" />
            <span className="opacity-80">Buscar consumidora…</span>
            <kbd className="ml-auto text-[10px] opacity-60 bg-sidebar/40 rounded px-1.5 py-0.5">
              ⌘K
            </kbd>
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {NAV.filter((n) => canAccessRoute(user.role, n.to)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150 ease-in-out",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                    : "hover:bg-sidebar-accent text-sidebar-foreground/85",
                )
              }
            >
              <item.icon className="size-[18px] shrink-0" />
              {item.performance ? (isManager ? "Desempeño del Equipo" : "Mi Desempeño") : item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-sidebar-border">
          <div className="rounded-lg p-3 bg-sidebar-accent/40">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-display font-semibold">
                {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-[11px] opacity-70 truncate">
                  {ROLE_LABEL[user.role]}
                </p>
              </div>
            </div>
            <p className="text-[11px] opacity-60 mt-2">
              {store?.name}
            </p>

            <div className="flex items-center gap-1 mt-3 rounded-md bg-sidebar-accent/40 p-1">
              <button
                type="button"
                onClick={() => setActiveBrand("lancome")}
                className={cn(
                   "flex-1 text-[10px] uppercase tracking-[0.12em] py-1.5 rounded-md transition-colors duration-150",
                    activeBrand === "lancome"
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "opacity-60 hover:opacity-100",
                )}
              >
                Lancôme
              </button>
              <button
                type="button"
                onClick={() => setActiveBrand("ysl")}
                className={cn(
                   "flex-1 text-[10px] uppercase tracking-[0.12em] py-1.5 rounded-md transition-colors duration-150",
                  activeBrand === "ysl"
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "opacity-60 hover:opacity-100",
                )}
              >
                YSL
              </button>
            </div>

            <button
              type="button"
              onClick={logout}
              className="w-full mt-2 flex items-center justify-center gap-1.5 text-[11px] opacity-70 hover:opacity-100 py-1.5"
            >
              <LogOut className="size-3" /> Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {!online && (
          <div className="bg-warning/15 text-warning border-b border-warning/30 text-xs px-4 py-1.5 flex items-center justify-center gap-2">
            <WifiOff className="size-3.5" />
            Modo sin conexión — los cambios se sincronizarán al reconectarte.
          </div>
        )}
        <main key={location.pathname} className="flex-1 overflow-y-auto animate-fade-in">
          <Outlet />
        </main>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

// avoid unused imports
void ClipboardList;
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrandProvider } from "@/components/layout/BrandProvider";
import { AppShell } from "@/components/layout/AppShell";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Consumers from "./pages/Consumers";
import NewConsumer from "./pages/NewConsumer";
import ConsumerProfile from "./pages/ConsumerProfile";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <BrandProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" richColors closeButton />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/consumidoras" element={<Consumers />} />
              <Route path="/consumidoras/nueva" element={<NewConsumer />} />
              <Route path="/consumidoras/:id" element={<ConsumerProfile />} />
              <Route
                path="/recomendaciones"
                element={
                  <ComingSoon
                    title="Motor de Recomendaciones"
                    description="Sugerencias inteligentes basadas en perfil, historial y reposición."
                    features={[
                      "Sugerencias por tipo de piel y preocupaciones",
                      "Escáner de SKU + búsqueda en catálogo",
                      "Constructor de lookbook compartible por WhatsApp",
                      "Historial completo en perfil de consumidora",
                    ]}
                  />
                }
              />
              <Route
                path="/compras"
                element={
                  <ComingSoon
                    title="Registrar Compras"
                    description="Captura de tickets vinculados al perfil 360°."
                    features={[
                      "Escáner SKU simulado + búsqueda manual",
                      "Atribución automática a la BA con sesión",
                      "Cálculo de subtotales y total en MXN",
                      "Exportación del historial a Excel/CSV",
                    ]}
                  />
                }
              />
              <Route
                path="/agenda"
                element={
                  <ComingSoon
                    title="Agenda y Citas"
                    description="Vista semanal y mensual con eventos en cabina."
                    features={[
                      "Tipos: Cabina VIP, Facial, Masterclass, Aniversario",
                      "Estados Confirmada / Pendiente / Reagendada",
                      "Widget de citas de hoy en el inicio",
                      "Reporte exportable a Excel",
                    ]}
                  />
                }
              />
              <Route
                path="/seguimiento"
                element={
                  <ComingSoon
                    title="Seguimiento y Comunicaciones"
                    description="Plantillas WhatsApp/SMS personalizadas y log completo."
                    features={[
                      "Plantillas: cumpleaños, reposición, post-visita, lanzamiento, evento VIP",
                      "Personalización con nombre, producto, BA, tienda",
                      "Copiar al portapapeles para WhatsApp (MVP)",
                      "Log completo en el perfil de la consumidora",
                    ]}
                  />
                }
              />
              <Route
                path="/reportes"
                element={
                  <ComingSoon
                    title="Reportes y Dashboard Analítico"
                    description="KPIs, gráficas y tasa de adopción de las BAs."
                    features={[
                      "Avance vs. objetivo, sell-out, transacciones, nuevos registros",
                      "Ventas por BA y por categoría (Skincare/Makeup/Fragancia)",
                      "Tasa de adopción como métrica héroe",
                      "Lista exportable de consumidoras con filtros",
                    ]}
                  />
                }
              />
              <Route
                path="/configuracion"
                element={
                  <ComingSoon
                    title="Configuración"
                    description="Preferencias del usuario, marca activa y plantillas."
                    features={[
                      "Cambio rápido de marca Lancôme ↔ YSL",
                      "Gestión de plantillas de mensajes",
                      "Tipos de evento configurables",
                      "Versiones del aviso de privacidad",
                    ]}
                  />
                }
              />
            </Route>
            <Route path="/index" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </BrandProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

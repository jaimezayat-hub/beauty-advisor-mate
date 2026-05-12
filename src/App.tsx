import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrandProvider } from "@/components/layout/BrandProvider";
import { AppShell } from "@/components/layout/AppShell";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { AuthSync } from "@/components/layout/AuthSync";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Consumers from "./pages/Consumers";
import NewConsumer from "./pages/NewConsumer";
import ConsumerProfile from "./pages/ConsumerProfile";
import Purchases from "./pages/Purchases";
import Recommendations from "./pages/Recommendations";
import Agenda from "./pages/Agenda";
import FollowUpPage from "./pages/FollowUp";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Performance from "./pages/Performance";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <BrandProvider>
        <TooltipProvider>
          <AuthSync />
          <Toaster />
          <Sonner position="top-center" richColors closeButton />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<RouteGuard />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/consumidoras" element={<Consumers />} />
              <Route path="/consumidoras/nueva" element={<NewConsumer />} />
              <Route path="/consumidoras/:id" element={<ConsumerProfile />} />
              <Route path="/recomendaciones" element={<Recommendations />} />
              <Route path="/compras" element={<Purchases />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/seguimiento" element={<FollowUpPage />} />
              <Route path="/reportes" element={<Reports />} />
              <Route path="/desempeno" element={<Performance />} />
              <Route path="/configuracion" element={<Settings />} />
            </Route>
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

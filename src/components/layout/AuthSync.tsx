import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/useApp";
import { fetchProfile, fetchRoles, pickPrimaryRole } from "@/lib/auth";
import type { User } from "@/lib/types";

/**
 * Mantiene sincronizada la sesión real de Lovable Cloud con el store local.
 * Al detectar login real:
 *   - carga profile + roles
 *   - inyecta un User en el store y lo marca como currentUser
 * Al hacer logout en cloud, también limpia el store.
 */
export function AuthSync() {
  const loginAsRealUser = useApp((s) => s.loginAsRealUser);
  const logout = useApp((s) => s.logout);

  useEffect(() => {
    const hydrate = async (userId: string, email: string | null) => {
      const [profile, roles] = await Promise.all([fetchProfile(userId), fetchRoles(userId)]);
      const u: User = {
        id: userId,
        name: profile?.display_name || email?.split("@")[0] || "Usuario",
        email: profile?.email ?? email ?? "",
        role: pickPrimaryRole(roles),
        brand: (profile?.brand as User["brand"]) ?? "lancome",
        storeId: profile?.store_id ?? "store-pdh-polanco",
        region: profile?.region ?? undefined,
        active: profile?.active ?? true,
      };
      loginAsRealUser(u);
    };

    // Listener primero, luego getSession (orden crítico)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        logout();
        return;
      }
      if (session?.user) {
        // Defer para no bloquear el callback
        setTimeout(() => hydrate(session.user.id, session.user.email ?? null), 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) hydrate(session.user.id, session.user.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, [loginAsRealUser, logout]);

  return null;
}

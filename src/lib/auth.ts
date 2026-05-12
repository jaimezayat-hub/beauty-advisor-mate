import { supabase } from "@/integrations/supabase/client";
import type { Role } from "./types";

export interface AuthProfile {
  id: string;
  display_name: string;
  email: string | null;
  brand: "lancome" | "ysl";
  store_id: string | null;
  region: string | null;
  active: boolean;
}

export async function fetchProfile(userId: string): Promise<AuthProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email, brand, store_id, region, active")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[auth] fetchProfile", error);
    return null;
  }
  return data as AuthProfile | null;
}

export async function fetchRoles(userId: string): Promise<Role[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) {
    console.error("[auth] fetchRoles", error);
    return [];
  }
  return (data ?? []).map((r) => r.role as Role);
}

/** Devuelve el rol "más alto" cuando hay varios. */
export function pickPrimaryRole(roles: Role[]): Role {
  const order: Role[] = [
    "central_admin",
    "zone_supervisor",
    "store_manager_palacio",
    "store_manager_liverpool",
    "ba",
  ];
  for (const r of order) if (roles.includes(r)) return r;
  return "ba";
}

export async function signOut() {
  await supabase.auth.signOut();
}

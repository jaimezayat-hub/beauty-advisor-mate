import type { Brand, Role, User } from "./types";

/**
 * Centraliza el alcance (scope) de visibilidad de datos por rol.
 * RF-50 a RF-54 — Roles y permisos.
 */

export type Scope =
  | { kind: "self"; userId: string; brand: Brand }
  | { kind: "store"; storeId: string }
  | { kind: "region"; region: string }
  | { kind: "all" };

export function getScope(user: User): Scope {
  switch (user.role) {
    case "ba":
      return { kind: "self", userId: user.id, brand: user.brand };
    case "store_manager_palacio":
    case "store_manager_liverpool":
      return { kind: "store", storeId: user.storeId };
    case "zone_supervisor":
      return { kind: "region", region: user.region ?? "" };
    case "central_admin":
      return { kind: "all" };
  }
}

export interface ScopeFilterDeps {
  storeIdToRegion?: Record<string, string>;
  baToStoreId?: Record<string, string>;
}

/**
 * Devuelve true si el registro `record` pertenece al alcance del usuario.
 * Funciona con cualquier objeto que tenga (algunos de) baId/assignedBaId/storeId.
 */
export function inScope(
  scope: Scope,
  record: { baId?: string; assignedBaId?: string; storeId?: string },
  deps: ScopeFilterDeps = {},
): boolean {
  const ownerId = record.baId ?? record.assignedBaId;
  switch (scope.kind) {
    case "all":
      return true;
    case "self":
      return ownerId === scope.userId;
    case "store": {
      if (record.storeId) return record.storeId === scope.storeId;
      if (ownerId && deps.baToStoreId) return deps.baToStoreId[ownerId] === scope.storeId;
      return false;
    }
    case "region": {
      const sid = record.storeId ?? (ownerId ? deps.baToStoreId?.[ownerId] : undefined);
      if (!sid || !deps.storeIdToRegion) return false;
      return deps.storeIdToRegion[sid] === scope.region;
    }
  }
}

export const ROLE_LABEL: Record<Role, string> = {
  ba: "Beauty Advisor",
  store_manager_palacio: "Gerente · Palacio",
  store_manager_liverpool: "Gerente · Liverpool",
  zone_supervisor: "Supervisor de Zona",
  central_admin: "Administrador Central",
};

export function canAccessRoute(role: Role, route: string): boolean {
  // Soporta rutas con sub-paths (ej: /reportes/x)
  const startsWith = (p: string) => route === p || route.startsWith(p + "/");
  if (startsWith("/reportes")) return role !== "ba"; // RF-52
  if (startsWith("/configuracion")) return role === "central_admin"; // RF-54
  return true;
}

export function isManagerRole(role: Role): boolean {
  return role !== "ba";
}

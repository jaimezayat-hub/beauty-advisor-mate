import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Brand } from "@/lib/types";

export type GoalScopeKind = "store" | "region" | "ba" | "all";

export interface GoalsLookupInput {
  brand?: Brand | "all";
  storeId?: string | "all";
  region?: string | "all";
  baId?: string | "all";
  from: string; // ISO date
  to: string; // ISO date
}

export interface ResolvedTarget {
  /** Suma de target_value de los goals aplicables al período/scope */
  sellOutTarget: number;
  /** Total de citas semanales objetivo (si existe la métrica) */
  appointmentsTarget: number;
  /** Nuevos registros objetivo (si existe) */
  newConsumersTarget: number;
  /** Cuántos goals se sumaron */
  goalsCount: number;
}

/**
 * Lee `goals` aplicables al período/scope solicitado. Cuando no hay metas
 * configuradas se devuelve un fallback razonable.
 */
export function useReportGoals(input: GoalsLookupInput, enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["report-goals", input],
    queryFn: async (): Promise<ResolvedTarget> => {
      const fromDate = input.from.slice(0, 10);
      const toDate = input.to.slice(0, 10);
      let q = supabase
        .from("goals")
        .select("metric, target_value, scope, scope_ref, brand, period_start, period_end")
        .gte("period_end", fromDate)
        .lte("period_start", toDate);
      if (input.brand && input.brand !== "all") q = q.eq("brand", input.brand as any);
      const { data, error } = await q;
      if (error) throw error;

      const matches = (data ?? []).filter((g) => {
        if (g.scope === "ba" && input.baId && input.baId !== "all")
          return g.scope_ref === input.baId;
        if (g.scope === "store" && input.storeId && input.storeId !== "all")
          return g.scope_ref === input.storeId;
        if (g.scope === "region" && input.region && input.region !== "all")
          return g.scope_ref === input.region;
        // sin filtros específicos: incluir todos del scope
        return true;
      });

      const byMetric = (m: string) =>
        matches.filter((g) => g.metric === m).reduce((s, g) => s + Number(g.target_value ?? 0), 0);

      return {
        sellOutTarget: byMetric("sales") || byMetric("sell_out") || 0,
        appointmentsTarget: byMetric("appointments") || 0,
        newConsumersTarget: byMetric("new_consumers") || byMetric("registros") || 0,
        goalsCount: matches.length,
      };
    },
  });
}
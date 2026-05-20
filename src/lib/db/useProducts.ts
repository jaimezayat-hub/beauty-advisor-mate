import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Brand, Product } from "@/lib/types";

/** Catálogo de productos por marca (lectura abierta). */
export function useProductsList(brand: Brand | "all", enabled = true) {
  return useQuery({
    queryKey: ["products", brand],
    enabled,
    queryFn: async (): Promise<Product[]> => {
      let q = supabase.from("products").select("*").eq("active", true).limit(500);
      if (brand !== "all") q = q.eq("brand", brand);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((p) => {
        const cat = (p.category ?? "Skincare") as Product["category"];
        // simple deterministic hue
        const hue =
          (Array.from(p.sku).reduce((s, ch) => s + ch.charCodeAt(0), 0) * 7) % 360;
        return {
          sku: p.sku,
          name: p.name,
          brand: p.brand as Brand,
          category: cat,
          price: Number(p.price ?? 0),
          description: (p.attributes as any)?.description ?? "",
          benefits: ((p.attributes as any)?.benefits ?? []) as string[],
          imageHue: hue,
          inStock: true,
          ingredients: ((p.attributes as any)?.ingredients ?? []) as string[],
          howToUse: (p.attributes as any)?.howToUse,
          saleArguments: ((p.attributes as any)?.saleArguments ?? []) as string[],
          tutorialUrl: (p.attributes as any)?.tutorialUrl,
        };
      });
    },
  });
}
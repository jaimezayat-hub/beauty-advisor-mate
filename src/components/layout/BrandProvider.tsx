import { useEffect } from "react";
import { useApp } from "@/store/useApp";

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const brand = useApp((s) => s.activeBrand);

  useEffect(() => {
    document.documentElement.setAttribute("data-brand", brand);
    document.documentElement.style.colorScheme = brand === "ysl" ? "dark" : "light";
  }, [brand]);

  return <>{children}</>;
}
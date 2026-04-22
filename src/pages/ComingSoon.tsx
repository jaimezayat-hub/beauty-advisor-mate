import { PageHeader } from "@/components/clienteling/PageHeader";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function ComingSoon({
  title,
  description,
  features,
}: {
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-8">
      <PageHeader eyebrow="Próximamente" title={title} description={description} />
      <Card className="p-10 shadow-card text-center">
        <div className="mx-auto size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Sparkles className="size-6" />
        </div>
        <h2 className="font-display text-2xl mb-2">En construcción</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Este módulo será incluido en la siguiente iteración. Funcionalidades planeadas:
        </p>
        <ul className="mt-6 max-w-md mx-auto space-y-2 text-left">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <span className="text-primary mt-1">·</span>
              {f}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
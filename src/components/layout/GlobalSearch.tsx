import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useApp } from "@/store/useApp";
import { fullName } from "@/lib/format";
import { SegmentBadge } from "@/components/clienteling/SegmentBadge";

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const consumers = useApp((s) => s.consumers);
  const navigate = useNavigate();

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar por nombre, correo o teléfono…" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        <CommandGroup heading="Consumidoras">
          {consumers.slice(0, 60).map((c) => (
            <CommandItem
              key={c.id}
              value={`${c.firstName} ${c.lastName} ${c.email} ${c.phone}`}
              onSelect={() => {
                onOpenChange(false);
                navigate(`/consumidoras/${c.id}`);
              }}
            >
              <div className="flex-1 truncate">
                <p className="font-medium">{fullName(c.firstName, c.lastName)}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {c.email} · {c.phone}
                </p>
              </div>
              <SegmentBadge segment={c.segment} size="sm" />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
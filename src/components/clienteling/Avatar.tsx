import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

export function ConsumerAvatar({
  firstName,
  lastName,
  size = 40,
  className,
}: {
  firstName: string;
  lastName: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 rounded-full font-display flex items-center justify-center text-primary-foreground bg-gradient-brand shadow-card",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(firstName, lastName)}
    </div>
  );
}
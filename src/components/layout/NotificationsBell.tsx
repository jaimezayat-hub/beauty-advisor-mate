import { Bell, Check, CheckCheck } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/db/useNotifications";
import { useApp } from "@/store/useApp";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const { isRealSession } = useApp();
  const { data: items = [] } = useNotifications(isRealSession);
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  if (!isRealSession) return null;

  const unread = items.filter((n) => !n.read_at).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative size-9 rounded-full hover:bg-muted flex items-center justify-center transition"
          aria-label="Notificaciones"
        >
          <Bell className="size-[18px] text-foreground/80" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="font-display text-base">Notificaciones</p>
            <p className="text-xs text-muted-foreground">
              {unread === 0
                ? "Todo al día"
                : `${unread} sin leer`}
            </p>
          </div>
          {unread > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => markAll.mutate()}
              className="text-xs h-7"
            >
              <CheckCheck className="size-3.5 mr-1" /> Marcar todo
            </Button>
          )}
        </div>
        <ScrollArea className="h-[360px]">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Sin notificaciones todavía.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "px-4 py-3 text-sm flex gap-3 items-start",
                    !n.read_at && "bg-primary/5",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{n.title}</p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {n.body}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                  {!n.read_at && (
                    <button
                      type="button"
                      onClick={() => markOne.mutate(n.id)}
                      className="opacity-60 hover:opacity-100"
                      aria-label="Marcar como leída"
                    >
                      <Check className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

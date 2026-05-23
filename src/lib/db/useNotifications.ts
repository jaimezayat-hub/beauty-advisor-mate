import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
}

export function useNotifications(enabled = true) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const ch = supabase
      .channel("rt-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => qc.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [enabled, qc]);

  return useQuery({
    queryKey: ["notifications"],
    enabled,
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", uid)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// ---------- Preferences ----------

export type NotifChannel = "inapp" | "email" | "whatsapp" | "sms";
export const NOTIF_CHANNELS: NotifChannel[] = ["inapp", "email", "whatsapp", "sms"];

export function useNotificationPrefs(enabled = true) {
  return useQuery({
    queryKey: ["notification_prefs"],
    enabled,
    queryFn: async (): Promise<Record<NotifChannel, boolean>> => {
      const { data, error } = await supabase
        .from("notification_prefs")
        .select("channel, enabled");
      if (error) throw error;
      const out: Record<NotifChannel, boolean> = {
        inapp: true,
        email: true,
        whatsapp: true,
        sms: true,
      };
      for (const r of data ?? []) out[r.channel as NotifChannel] = r.enabled;
      return out;
    },
  });
}

export function useSetNotificationPref() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      channel,
      enabled,
    }: {
      channel: NotifChannel;
      enabled: boolean;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Sin sesión");
      const { error } = await supabase
        .from("notification_prefs")
        .upsert(
          { user_id: uid, channel, enabled },
          { onConflict: "user_id,channel" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification_prefs"] }),
  });
}

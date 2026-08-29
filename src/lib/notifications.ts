import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import type { Notification } from "./types";
import { useEffect } from "react";

// Notification sound player
function playNotificationSound() {
  try {
    const audio = new Audio("/sound/notification.mp3");
    audio.volume = 0.5;
    audio.play().catch(() => { });
  } catch { }
}

export function useNotifications() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const isAdmin = profile?.is_admin;

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const targetUserIds = [userId];
      if (isAdmin) targetUserIds.push("admin");

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .in("user_id", targetUserIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            playNotificationSound();
          }
          queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isAdmin, queryClient]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
  };
}

export const createNotification = async (payload: Omit<Notification, "id" | "created_at" | "is_read">) => {
  const { error } = await supabase.from("notifications").insert(payload);
  if (error) {
    console.error("Failed to create notification:", error);
  }
};

export const markNotificationAsRead = async (id: string) => {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
  if (error) {
    console.error("Failed to mark as read:", error);
  }
};

export const markAllNotificationsAsRead = async (userId: string, isAdmin: boolean) => {
  const targetUserIds = [userId];
  if (isAdmin) targetUserIds.push("admin");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .in("user_id", targetUserIds)
    .eq("is_read", false);
  if (error) {
    console.error("Failed to mark all as read:", error);
  }
};

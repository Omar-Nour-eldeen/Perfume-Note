import { Bell, Check } from "lucide-react";
import { useNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/notifications";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { useState } from "react";

interface NotificationBellProps {
  isSolid?: boolean;
}

export function NotificationBell({ isSolid = true }: NotificationBellProps) {
  const { language } = useI18n();
  const ar = language === "ar";
  const { user, profile } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const queryClient = useQueryClient();

  
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  const handleNavigate = (linkString: string, notifType?: string) => {
    setSelectedNotification(null);

    // Non-admin: open chat widget
    if (!profile?.is_admin && (linkString === "#chat" || linkString === "open_chat" || (!linkString && notifType === "new_chat_message"))) {
      window.dispatchEvent(new Event("open-chat-widget"));
      return;
    }

    // Admin chat notification
    if (profile?.is_admin && notifType === "new_chat_message") {
      let targetLink = linkString;
      if (!targetLink || targetLink === "#chat" || targetLink === "open_chat") {
        targetLink = "/admin/chat";
      }

      const onChatPage = window.location.pathname.startsWith("/admin/chat");

      if (onChatPage) {
        // Already on the chat page → dispatch event so the listener picks it up immediately
        let sessionId: string | null = null;
        if (targetLink.includes("sessionId=")) {
          try { sessionId = new URL(targetLink, window.location.origin).searchParams.get("sessionId"); } catch { }
        }
        window.dispatchEvent(new CustomEvent("select-admin-chat-session", { detail: { sessionId } }));
      } else {
        // On a different page → full reload to the URL (sessionId in URL, picked up by Route.useSearch)
        window.location.href = targetLink;
      }
      return;
    }

    if (!linkString) return;
    window.location.href = linkString;
  };

  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "relative transition-colors",
              isSolid ? "text-muted-foreground hover:text-foreground" : "text-white/80 hover:text-white"
            )}
            aria-label={ar ? "الإشعارات" : "Notifications"}
          >
            <Bell className="w-[18px] h-[18px]" strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span
                key={unreadCount}
                className="absolute -top-2 -end-2 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce-once"
              >
                {unreadCount > 9 ? "+9" : unreadCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden" sideOffset={12}>
          <div className="flex items-center justify-between p-4 border-b border-border/50 bg-secondary/20">
            <h3 className="font-bold text-sm">{ar ? "الإشعارات" : "Notifications"}</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await markAllNotificationsAsRead(user.id, profile?.is_admin || false);
                  queryClient.invalidateQueries({ queryKey: ["notifications"] });
                }}
                className="h-auto p-0 text-xs text-primary hover:text-primary/80"
              >
                <Check className="w-3 h-3 me-1" />
                {ar ? "تحديد الكل كمقروء" : "Mark all read"}
              </Button>
            )}
          </div>
          <div className="max-h-[350px] overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="flex flex-col divide-y divide-border/50">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "relative p-4 transition-colors cursor-pointer",
                      !notification.is_read ? "bg-primary/5" : "hover:bg-secondary/30"
                    )}
                    onClick={async () => {
                      if (!notification.is_read) {
                        await markNotificationAsRead(notification.id);
                        queryClient.invalidateQueries({ queryKey: ["notifications"] });
                      }
                      setSelectedNotification(notification);
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-1">
                        <p
                          className={cn(
                            "text-sm",
                            !notification.is_read ? "font-bold text-foreground" : "font-medium text-foreground/80"
                          )}
                        >
                          {ar ? notification.title_ar : notification.title_en}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {ar ? notification.body_ar : notification.body_en}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 pt-1">
                          {new Date(notification.created_at).toLocaleString(ar ? "ar-EG" : "en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                {ar ? "لا توجد إشعارات حالياً" : "No notifications yet"}
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedNotification ? (ar ? selectedNotification.title_ar : selectedNotification.title_en) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">
            {selectedNotification ? (ar ? selectedNotification.body_ar : selectedNotification.body_en) : ""}
          </div>
          {(selectedNotification?.link || selectedNotification?.type === "new_chat_message") && (
            <DialogFooter>
              <Button onClick={() => handleNavigate(selectedNotification.link ?? "", selectedNotification.type)}>
                {selectedNotification?.type === "new_chat_message" || selectedNotification?.link === "#chat"
                  ? (ar ? "فتح المحادثة" : "Open Chat")
                  : (ar ? "عرض التفاصيل" : "View Details")}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

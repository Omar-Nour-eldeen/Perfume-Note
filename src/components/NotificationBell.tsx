import { Bell, Check } from "lucide-react";
import { useNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/notifications";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
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
  
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

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
                onClick={() => markAllNotificationsAsRead(user.id, profile?.is_admin || false)}
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
                    onClick={() => {
                      if (!notification.is_read) {
                        markNotificationAsRead(notification.id);
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
          {selectedNotification?.link && (
            <DialogFooter>
              <Button asChild onClick={() => setSelectedNotification(null)}>
                <Link to={selectedNotification.link}>
                  {ar ? "عرض التفاصيل" : "View Details"}
                </Link>
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

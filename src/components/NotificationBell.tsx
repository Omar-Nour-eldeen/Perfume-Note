import { Bell, Check, BellOff, BellRing, Loader2, Lock, ShieldAlert } from "lucide-react";
import { useNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/notifications";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscriptionStatus,
  registerServiceWorker,
  watchPushPermission,
} from "@/lib/push-notifications";

interface NotificationBellProps {
  isSolid?: boolean;
}

export function NotificationBell({ isSolid = true }: NotificationBellProps) {
  const { language } = useI18n();
  const ar = language === "ar";
  const { user, profile } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  // ── Push Notification State ──────────────────────
  const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const [pushLoading, setPushLoading] = useState(false);
  const [showUnblockGuide, setShowUnblockGuide] = useState(false);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const check = async () => {
      await registerServiceWorker();
      const status = await getPushSubscriptionStatus();
      if (isMounted) {
        setPushStatus(status);
      }
    };

    check();

    // مراقبة أي تغيير حقيقي من إعدادات المتصفح بدون الحاجة لعمل ريفريش
    const unwatch = watchPushPermission((newStatus) => {
      if (isMounted) setPushStatus(newStatus);
    });

    return () => {
      isMounted = false;
      unwatch();
    };
  }, [user?.id]);

  const handleTogglePush = async () => {
    if (!user) return;
    setPushLoading(true);
    try {
      if (pushStatus === 'granted') {
        // إلغاء تفعيل الإشعارات (المستخدم قرر إيقافها)
        await unsubscribeFromPush(user.id);
        const newStatus = await getPushSubscriptionStatus();
        setPushStatus(newStatus);
      } else if (pushStatus === 'denied') {
        // المتصفح يحظر الإشعارات → إظهار دليل طريقة إلغاء الحظر
        setShowUnblockGuide(true);
      } else {
        // تفعيل الإشعارات
        const success = await subscribeToPush(user.id, profile?.is_admin || false);
        const newStatus = await getPushSubscriptionStatus();
        setPushStatus(newStatus);
        if (!success && newStatus === 'denied') {
          setShowUnblockGuide(true);
        }
      }
    } finally {
      setPushLoading(false);
    }
  };

  const handleNavigate = (linkString: string, notifType?: string) => {
    setSelectedNotification(null);

    if (!linkString && !notifType) return;

    const isChat = notifType === "new_chat_message"
      || linkString === "#chat"
      || linkString === "open_chat"
      || linkString?.includes("openChat");

    // 1. العميل: إشعار شات → افتح نافذة الشات مباشرةً
    if (!profile?.is_admin && isChat) {
      window.dispatchEvent(new Event("open-chat-widget"));
      return;
    }

    // 2. الآدمن: إشعار شات → صفحة /admin/chat مع اختيار الجلسة
    if (profile?.is_admin && isChat) {
      let targetLink = linkString;
      if (!targetLink || targetLink === "#chat" || targetLink === "open_chat" || targetLink?.includes("openChat")) {
        targetLink = "/admin/chat";
      }

      const onChatPage = window.location.pathname.startsWith("/admin/chat");
      if (onChatPage) {
        let sessionId: string | null = null;
        if (targetLink.includes("sessionId=")) {
          try { sessionId = new URL(targetLink, window.location.origin).searchParams.get("sessionId"); } catch { }
        }
        window.dispatchEvent(new CustomEvent("select-admin-chat-session", { detail: { sessionId } }));
      } else {
        router.navigate({ to: targetLink as any });
      }
      return;
    }

    // 3. أي إشعار آخر (طلبات، مرتجعات، إلخ) → TanStack Router navigation بدون ريفريش
    if (!linkString) return;

    // فصل المسار عن query params
    const [targetPath, queryString] = linkString.split("?");
    const searchObj: Record<string, string> = {};
    if (queryString) {
      new URLSearchParams(queryString).forEach((v, k) => { searchObj[k] = v; });
    }

    router.navigate({
      to: targetPath as any,
      search: Object.keys(searchObj).length ? searchObj : undefined,
    });
  };

  if (!user) return null;

  return (
    <>
      <DropdownMenu onOpenChange={(open) => {
        if (open) getPushSubscriptionStatus().then(setPushStatus);
      }}>
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
                      handleNavigate(notification.link ?? "", notification.type);
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

          {/* ── Push Notification Control Toggle ────────────── */}
          {isPushSupported() && (
            <div className="p-3 border-t border-border/50 bg-secondary/10">
              <button
                onClick={handleTogglePush}
                disabled={pushLoading}
                className={cn(
                  "w-full flex items-center justify-between text-xs rounded-lg px-3 py-2 transition-all font-medium",
                  pushStatus === 'granted'
                    ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                    : pushStatus === 'denied'
                    ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}
              >
                <div className="flex items-center gap-2">
                  {pushLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : pushStatus === 'granted' ? (
                    <BellRing className="w-3.5 h-3.5" />
                  ) : pushStatus === 'denied' ? (
                    <ShieldAlert className="w-3.5 h-3.5" />
                  ) : (
                    <BellOff className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {pushLoading
                      ? (ar ? "جارٍ التحديث..." : "Updating...")
                      : pushStatus === 'granted'
                      ? (ar ? "إشعارات الجهاز: مفعّلة ✓" : "Device Notifications: On ✓")
                      : pushStatus === 'denied'
                      ? (ar ? "الإشعارات محظورة (اضغط للحل)" : "Notifications Blocked (Fix)")
                      : (ar ? "تفعيل إشعارات الجهاز" : "Enable Device Notifications")}
                  </span>
                </div>

                <span className="text-[10px] underline font-bold opacity-80">
                  {pushStatus === 'granted'
                    ? (ar ? "إيقاف" : "Turn Off")
                    : pushStatus === 'denied'
                    ? (ar ? "تغيير" : "Change")
                    : (ar ? "تفعيل" : "Enable")}
                </span>
              </button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── Notification Detail Dialog ────────────── */}
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

      {/* ── Modal Guide for Unblocking Notifications ────────────── */}
      <Dialog open={showUnblockGuide} onOpenChange={setShowUnblockGuide}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-5 h-5" />
              {ar ? "كيفية التغيير من Block إلى Allow" : "How to Change from Block to Allow"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm text-foreground/90">
            <p className="leading-relaxed">
              {ar
                ? "قام المتصفح بحظر الإشعارات سابقاً. لتلقي الإشعارات أو التغيير بين السماح والحظر:"
                : "Your browser currently blocks notifications. To allow or change settings:"}
            </p>

            <div className="bg-secondary/40 p-3 rounded-lg space-y-2 border border-border/50 text-xs">
              <div className="flex items-center gap-2 font-semibold">
                <Lock className="w-4 h-4 text-primary shrink-0" />
                <span>{ar ? "الخطوة 1: اضغط على أيقونة إعدادات الموقع 🎛️ أو القفل 🔒 بجانب الرابط فوق" : "Step 1: Click site settings 🎛️ or lock 🔒 icon next to URL above"}</span>
              </div>
              <div className="flex items-center gap-2 font-semibold pt-1">
                <BellRing className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{ar ? "الخطوة 2: غير الإشعارات (Notifications) إلى السماح (Allow)" : "Step 2: Change Notifications setting to Allow"}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setShowUnblockGuide(false)} className="w-full">
              {ar ? "حسناً، فهمت" : "Got it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

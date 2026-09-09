// =====================================================
// NotificationPromptBanner
// بانر يظهر للمستخدم لتفعيل الإشعارات
// =====================================================

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  isPushSupported,
  subscribeToPush,
  getPushSubscriptionStatus,
  watchPushPermission,
} from "@/lib/push-notifications";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "pn_notif_banner_dismissed";

export function NotificationPromptBanner() {
  const { user, profile } = useAuth();
  const { language } = useI18n();
  const ar = language === "ar";

  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;

    // 1. لو الإذن مفعّل بالفعل أو محظور بالكامل → لا تظهر البانر نهائياً
    if ("Notification" in window && Notification.permission !== "default") {
      return;
    }

    // 2. لو المستخدم أغلق البانر سابقاً → احترم رغبته ولا تظهر البانر
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    let timer: any;

    const checkAndShow = async () => {
      const status = await getPushSubscriptionStatus();
      if (status === "default") {
        const isStandalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as any).standalone === true;

        // في وضع standalone على Android Chrome نحاول طلب الإذن فوراً لو المتصفح يدعم
        if (isStandalone && "Notification" in window && Notification.permission === "default") {
          try {
            const perm = await Notification.requestPermission();
            if (perm === "granted") {
              localStorage.setItem(DISMISSED_KEY, "1");
              if (user?.id) {
                await subscribeToPush(user.id, profile?.is_admin || false);
              }
              return; // تم التفعيل تلقائياً
            }
          } catch (e) {
            console.warn("[Push] Auto requestPermission in standalone failed/requires gesture:", e);
          }
        }

        // إظهار البانر للمستخدم بعد تأخير بسيط
        timer = setTimeout(() => setVisible(true), 1500);
      }
    };

    void checkAndShow();

    const unwatch = watchPushPermission((status) => {
      if (status === "granted" || status === "denied") {
        setVisible(false);
        localStorage.setItem(DISMISSED_KEY, "1");
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      unwatch();
    };
  }, [user?.id, profile?.is_admin]);

  const handleEnable = async () => {
    setLoading(true);
    try {
      if (user?.id) {
        await subscribeToPush(user.id, profile?.is_admin || false);
      } else {
        if ("Notification" in window && Notification.permission === "default") {
          await Notification.requestPermission();
        }
      }
      const status = await getPushSubscriptionStatus();
      if (status === "granted") {
        setVisible(false);
        localStorage.setItem(DISMISSED_KEY, "1");
      }
    } catch (err) {
      console.error("[Push] Enable notification error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 lg:bottom-6 z-50",
        ar ? "left-4 lg:left-6" : "right-4 lg:right-6",
        "max-w-sm w-[calc(100%-2rem)] animate-in slide-in-from-bottom-4 fade-in duration-300"
      )}
    >
      <div className="bg-card border border-border shadow-2xl rounded-2xl p-4 flex items-start gap-3">
        {/* أيقونة */}
        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>

        {/* النص */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground leading-snug">
            {ar ? "فعّل إشعارات الجهاز 🔔" : "Enable Device Notifications 🔔"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {ar
              ? "لتصلك تنبيهات الطلبات والرسائل فوراً حتى والمتصفح مغلق"
              : "Get instant order & message alerts even when browser is closed"}
          </p>

          <button
            onClick={handleEnable}
            disabled={loading}
            className="mt-2.5 px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-60"
          >
            {loading
              ? (ar ? "جارٍ التفعيل..." : "Enabling...")
              : (ar ? "تفعيل الآن" : "Enable Now")}
          </button>
        </div>

        {/* زر الإغلاق */}
        <button
          onClick={handleDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground transition mt-0.5"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

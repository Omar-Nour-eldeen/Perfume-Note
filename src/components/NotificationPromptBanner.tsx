// =====================================================
// NotificationPromptBanner
// بانر يظهر مرة واحدة للمستخدم لتفعيل الإشعارات
// يعتمد على User Gesture (كليك) لضمان عمله على Firefox
// =====================================================

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { isPushSupported, subscribeToPush, getPushSubscriptionStatus, watchPushPermission } from "@/lib/push-notifications";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "pn_notif_banner_dismissed";

export function NotificationPromptBanner() {
  const { user, profile } = useAuth();
  const { language } = useI18n();
  const ar = language === "ar";

  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !profile || !isPushSupported()) return;

    // لا تظهر لو المستخدم سبق وأخفاها
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    // فحص الحالة الحالية — إذا لم يفعّل بعد نظهر البانر
    let timer: any;
    getPushSubscriptionStatus().then((status) => {
      if (status !== "granted") {
        timer = setTimeout(() => setVisible(true), 1200);
      }
    });

    const unwatch = watchPushPermission((status) => {
      if (status === "granted") {
        setVisible(false);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      unwatch();
    };
  }, [user?.id, profile?.is_admin]);

  const handleEnable = async () => {
    if (!user || !profile) return;
    setLoading(true);
    try {
      // هذا الكليك هو User Gesture → يعمل على Firefox وChrome بالكامل
      await subscribeToPush(user.id, profile.is_admin);
      const status = await getPushSubscriptionStatus();
      if (status === "granted") {
        setVisible(false);
        localStorage.setItem(DISMISSED_KEY, "1");
      }
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

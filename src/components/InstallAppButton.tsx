import { useState, useEffect, useRef } from "react";
import { Download, Smartphone, Sparkles, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { registerServiceWorker } from "@/lib/push-notifications";
import { toast } from "sonner";
import { useRouterState } from "@tanstack/react-router";

const INSTALLED_STORAGE_KEY = "pn_pwa_installed";

interface InstallAppButtonProps {
  className?: string;
  variant?: "button" | "link" | "banner" | "navbar" | "float";
}

export function InstallAppButton({ className, variant = "button" }: InstallAppButtonProps) {
  const { language } = useI18n();
  const ar = language === "ar";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isProductPage = pathname.startsWith("/product/");

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  // true بعد ما المستخدم يقبل الـ prompt، يفضل كدة لغاية ما appinstalled يطلق
  const [isInstalling, setIsInstalling] = useState(false);
  const arRef = useRef(ar);
  arRef.current = ar;

  // Firefox Desktop لا يدعم PWA install prompt نهائياً
  const isFirefoxDesktop =
    typeof navigator !== "undefined" &&
    navigator.userAgent.includes("Firefox") &&
    !/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);

  useEffect(() => {
    registerServiceWorker();

    // ─── إذا كان Chrome أرسل beforeinstallprompt مسبقاً (قبل mount الـ component) ───
    // هذا يعني أن التطبيق غير مثبت → نمسح localStorage ونظهر الزر فوراً
    if ((window as any).deferredInstallPrompt) {
      localStorage.removeItem(INSTALLED_STORAGE_KEY);
      setIsInstalled(false);
      setDeferredPrompt((window as any).deferredInstallPrompt);
    } else if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true ||
      localStorage.getItem(INSTALLED_STORAGE_KEY) === "true"
    ) {
      // التطبيق مثبت حالياً → إخفاء الزر
      setIsInstalled(true);
    }

    // ─── نسجّل المستمعين دايماً ───
    const SESSION_RELOAD_KEY = "pwa_reload_done";

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredInstallPrompt = e;
      setDeferredPrompt(e);
      localStorage.removeItem(INSTALLED_STORAGE_KEY);
      setIsInstalled(false);
      setIsInstalling(false);
      sessionStorage.removeItem(SESSION_RELOAD_KEY);
    };

    const handleAppInstalled = () => {
      // التطبيق اتنزل على الجهاز فعلاً → دلوقتي نبعت toast النجاح
      // id ثابت عشان لو في أكتر من instance من الـ component (float + navbar + banner)
      // Sonner بيتجاهل التكرار ويظهر toast واحدة بس
      toast.success(arRef.current ? "تم تثبيت التطبيق بنجاح! 🎉" : "App installed successfully! 🎉", {
        id: "pwa-app-installed",
      });
      setIsInstalling(false);
      setIsInstalled(true);
      localStorage.setItem(INSTALLED_STORAGE_KEY, "true");
      setDeferredPrompt(null);
      (window as any).deferredInstallPrompt = null;
    };

    // ─── لما المستخدم يرجع للتاب بعد ما يحذف التطبيق ───
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (sessionStorage.getItem(SESSION_RELOAD_KEY)) return;

      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true;

      if (!isStandalone && localStorage.getItem(INSTALLED_STORAGE_KEY) === "true") {
        sessionStorage.setItem(SESSION_RELOAD_KEY, "true");
        window.location.reload();
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptObj = deferredPrompt || (window as any).deferredInstallPrompt;
    if (!promptObj) return;
    try {
      promptObj.prompt();
      const { outcome } = await promptObj.userChoice;
      if (outcome === "accepted") {
        // المستخدم قبل → نبدأ حالة التحميل وننتظر appinstalled
        setIsInstalling(true);
        setDeferredPrompt(null);
        (window as any).deferredInstallPrompt = null;
      }
    } catch (err) {
      console.error("[PWA] Install prompt error:", err);
      setIsInstalling(false);
    }
  };

  // إذا كان التطبيق موجوداً ومثبتاً -> لا يظهر زر تنزيل التطبيق نهائياً
  if (isInstalled) return null;

  // Firefox Desktop لا يدعم التثبيت -> نخفي الزر بالكامل
  if (isFirefoxDesktop) return null;

  // ── Spinner مشترك ──
  const Spinner = () => <Loader2 className="w-3.5 h-3.5 animate-spin" />;

  if (variant === "link") {
    return (
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer transition-colors disabled:opacity-70 disabled:cursor-not-allowed",
          className
        )}
      >
        {isInstalling ? <Spinner /> : <Download className="w-3.5 h-3.5" />}
        <span>{isInstalling ? (ar ? "جارٍ التثبيت…" : "Installing…") : (ar ? "تنزيل التطبيق" : "Download App")}</span>
      </button>
    );
  }

  if (variant === "navbar") {
    const isTransparent = className?.includes("navbar-transparent");
    return (
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed",
          isTransparent
            ? "bg-white/15 text-white hover:bg-white/25 border border-white/20 backdrop-blur-sm shadow-sm"
            : "bg-gradient-to-r from-primary/90 to-primary text-primary-foreground hover:from-primary hover:to-primary/90 shadow-sm hover:shadow-md"
        )}
      >
        {isInstalling ? <Spinner /> : <Sparkles className="w-3 h-3" />}
        <span>{isInstalling ? (ar ? "جارٍ التثبيت…" : "Installing…") : (ar ? "تثبيت التطبيق" : "Install App")}</span>
      </button>
    );
  }

  if (variant === "float") {
    return (
      <div
        className={cn(
          isProductPage ? "fixed bottom-[136px] left-1/2 -translate-x-1/2 z-40 md:hidden" : "fixed bottom-[72px] left-1/2 -translate-x-1/2 z-40 md:hidden",
          "animate-in slide-in-from-bottom-4 fade-in duration-500",
          className
        )}
      >
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-primary/20 disabled:opacity-80 disabled:cursor-not-allowed disabled:scale-100"
        >
          {isInstalling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>{isInstalling ? (ar ? "جارٍ التثبيت…" : "Installing…") : (ar ? "تثبيت التطبيق" : "Install App")}</span>
        </button>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className={cn("bg-primary/10 border border-primary/20 rounded-xl p-3.5 flex items-center justify-between gap-3", className)}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">
              {ar ? "نزّل تطبيق Perfume Note" : "Download Perfume Note App"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {ar ? "تصفح أسرع وتنبيهات فورية على شاشتك" : "Faster browsing & instant device alerts"}
            </p>
          </div>
        </div>

        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className="shrink-0 px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition shadow-sm flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isInstalling ? <Spinner /> : <Download className="w-3.5 h-3.5" />}
          <span>{isInstalling ? (ar ? "جارٍ…" : "Wait…") : (ar ? "تثبيت الآن" : "Install Now")}</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      disabled={isInstalling}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed",
        className
      )}
    >
      {isInstalling ? <Spinner /> : <Download className="w-4 h-4" />}
      <span>{isInstalling ? (ar ? "جارٍ التثبيت…" : "Installing…") : (ar ? "تنزيل التطبيق" : "Download App")}</span>
    </button>
  );
}

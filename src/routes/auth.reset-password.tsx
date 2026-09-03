import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Lock, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { siteAssets } from "@/lib/site-assets";

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { language } = useI18n();
  const ar = language === "ar";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    // The recovery event can fire before this page finishes mounting.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setValidSession(true);
        setCheckingSession(false);
      }
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      setValidSession(!error && !!data.session);
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(ar ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error(
        ar
          ? "يجب أن تكون كلمة المرور 6 أحرف على الأقل"
          : "Password must be at least 6 characters"
      );
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      const isSamePasswordError = error.message
        .toLowerCase()
        .includes("new password should be different from the old password");

      toast.error(ar ? "فشل تحديث كلمة المرور" : "Failed to update password", {
        description: isSamePasswordError
          ? ar
            ? "يجب أن تكون كلمة المرور الجديدة مختلفة عن كلمة المرور القديمة"
            : "New password should be different from the old password"
          : error.message,
      });
    } else {
      setDone(true);
      setTimeout(() => {
        navigate({ to: "/auth/login" });
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen flex" dir={ar ? "rtl" : "ltr"}>
      {/* ── Decorative panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" aria-hidden="true">
        <img
          src={siteAssets.hero2}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1614]/70 via-[#8B6B4A]/40 to-[#1A1614]/60" />
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16">
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-white/90 text-sm font-medium tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-[#D4B896]" />
              {ar ? "إنشاء كلمة مرور جديدة" : "Create New Password"}
            </span>
          </div>
          <h2
            className="text-4xl font-serif text-white leading-tight mb-3"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {ar ? "كلمة مرور جديدة" : "New Password"}
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-xs">
            {ar
              ? "أدخل كلمة مرور جديدة قوية لحماية حسابك"
              : "Enter a strong new password to protect your account"}
          </p>
          <div className="flex gap-1.5 mt-8">
            <div className="w-8 h-0.5 bg-[#D4B896] rounded-full" />
            <div className="w-2 h-0.5 bg-white/40 rounded-full" />
            <div className="w-2 h-0.5 bg-white/40 rounded-full" />
          </div>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background min-h-screen">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Link to="/" className="inline-block">
              <img
                src={siteAssets.logo}
                alt="Perfume Note"
                className="h-12 mx-auto object-contain"
              />
            </Link>
          </div>

          {done ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#D4B896]/20 border border-[#D4B896]/40 mb-6">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <h1
                className="text-2xl font-serif text-foreground mb-3"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {ar ? "تم التحديث بنجاح!" : "Password Updated!"}
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                {ar
                  ? "تم تحديث كلمة المرور بنجاح. سيتم توجيهك لصفحة تسجيل الدخول..."
                  : "Your password has been updated successfully. Redirecting to login..."}
              </p>
              <Link
                to="/auth/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                {ar ? "تسجيل الدخول الآن" : "Login Now"}
              </Link>
            </div>
          ) : (
            <>
              <h1
                className="text-2xl font-serif text-foreground mb-2 text-center"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {ar ? "تعيين كلمة مرور جديدة" : "Set New Password"}
              </h1>
              <p className="text-sm text-muted-foreground text-center mb-8">
                {ar
                  ? "أدخل كلمة مرور جديدة لحسابك"
                  : "Enter a new password for your account"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="new-password">
                    {ar ? "كلمة المرور الجديدة" : "New Password"}
                  </label>
                  <div className="relative">
                    <Lock
                      className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none ${ar ? "right-3" : "left-3"}`}
                    />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`bg-background text-foreground ${ar ? "pr-10 pl-10" : "pl-10 pr-10"}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors ${ar ? "left-3" : "right-3"}`}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="confirm-password">
                    {ar ? "تأكيد كلمة المرور" : "Confirm Password"}
                  </label>
                  <div className="relative">
                    <Lock
                      className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none ${ar ? "right-3" : "left-3"}`}
                    />
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`bg-background text-foreground ${ar ? "pr-10 pl-10" : "pl-10 pr-10"} ${
                        confirmPassword && password !== confirmPassword
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors ${ar ? "left-3" : "right-3"}`}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive mt-1">
                      {ar ? "كلمتا المرور غير متطابقتين" : "Passwords do not match"}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading || checkingSession || !validSession}
                  className="w-full bg-primary text-primary-foreground py-6 text-sm font-semibold tracking-wide hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      {ar ? "جاري الحفظ..." : "Saving..."}
                    </>
                  ) : (
                    ar ? "حفظ كلمة المرور الجديدة" : "Save New Password"
                  )}
                </Button>

                {!checkingSession && !validSession && (
                  <p className="text-xs text-center text-muted-foreground">
                    {ar
                      ? "⚠️ الرابط غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد."
                      : "⚠️ Invalid or expired link. Please request a new reset link."}
                    {" "}
                    <Link to="/auth/forgot-password" className="text-primary hover:underline font-medium">
                      {ar ? "اضغط هنا" : "Click here"}
                    </Link>
                  </p>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

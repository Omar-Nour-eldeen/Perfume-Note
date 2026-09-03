import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { siteAssets } from "@/lib/site-assets";

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { language } = useI18n();
  const ar = language === "ar";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (profileError) {
      setLoading(false);
      toast.error(ar ? "تعذر التحقق من البريد الإلكتروني" : "Unable to verify email", {
        description: profileError.message,
      });
      return;
    }

    if (!profile) {
      setLoading(false);
      toast.error(ar ? "البريد الإلكتروني غير مسجل" : "Email is not registered", {
        description: ar ? "تأكد من البريد أو أنشئ حسابًا جديدًا" : "Check the email or create a new account",
      });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);

    if (error) {
      toast.error(ar ? "فشل إرسال رابط الاستعادة" : "Failed to send reset link", {
        description: error.message,
      });
    } else {
      setSent(true);
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
              {ar ? "استعادة كلمة المرور" : "Password Recovery"}
            </span>
          </div>
          <h2
            className="text-4xl font-serif text-white leading-tight mb-3"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {ar ? "نسيت كلمة المرور؟" : "Forgot Password?"}
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-xs">
            {ar
              ? "أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور"
              : "Enter your email and we'll send you a link to reset your password"}
          </p>
          <div className="flex gap-1.5 mt-8">
            <div className="w-8 h-0.5 bg-[#D4B896] rounded-full" />
            <div className="w-2 h-0.5 bg-white/40 rounded-full" />
            <div className="w-2 h-0.5 bg-white/40 rounded-full" />
          </div>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-background min-h-screen relative">
        <div className="w-full max-w-md">
          {/* Back to Home Button */}
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
            >
              <ArrowLeft className={`h-4 w-4 transition-transform ${ar ? "rotate-180 group-hover:translate-x-1" : "group-hover:-translate-x-1"}`} />
              {ar ? "العودة للرئيسية" : "Back to Home"}
            </Link>
          </div>

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

          {sent ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#D4B896]/20 border border-[#D4B896]/40 mb-6">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <h1
                className="text-2xl font-serif text-foreground mb-3"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {ar ? "تم الإرسال!" : "Email Sent!"}
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed mb-2">
                {ar
                  ? "تم إرسال رابط إعادة التعيين إلى"
                  : "We've sent a password reset link to"}
              </p>
              <p className="font-semibold text-foreground text-sm mb-6">{email}</p>
              <p className="text-xs text-muted-foreground mb-8 leading-relaxed max-w-xs mx-auto">
                {ar
                  ? "تحقق من صندوق الوارد (Inbox) أو مجلد الرسائل غير المرغوب فيها (Spam). قد يستغرق الأمر بضع دقائق."
                  : "Check your inbox or spam folder. It may take a few minutes to arrive."}
              </p>
              <Link
                to="/auth/login"
                className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:underline"
              >
                <ArrowLeft className={`h-4 w-4 ${ar ? "rotate-180" : ""}`} />
                {ar ? "العودة لتسجيل الدخول" : "Back to Login"}
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <h1
                className="text-2xl font-serif text-foreground mb-2 text-center"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {ar ? "استعادة كلمة المرور" : "Reset Password"}
              </h1>
              <p className="text-sm text-muted-foreground text-center mb-8">
                {ar
                  ? "أدخل بريدك الإلكتروني وسنرسل لك رابط الاستعادة"
                  : "Enter your email and we'll send you a reset link"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="forgot-email">
                    {ar ? "البريد الإلكتروني" : "Email Address"}
                  </label>
                  <div className="relative">
                    <Mail
                      className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none ${ar ? "right-3" : "left-3"}`}
                    />
                    <Input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={`bg-background text-foreground ${ar ? "pr-10" : "pl-10"}`}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground py-6 text-sm font-semibold tracking-wide hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      {ar ? "جاري الإرسال..." : "Sending..."}
                    </>
                  ) : (
                    ar ? "إرسال رابط الاستعادة" : "Send Reset Link"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/auth/login"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className={`h-4 w-4 ${ar ? "rotate-180" : ""}`} />
                  {ar ? "العودة لتسجيل الدخول" : "Back to Login"}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { siteAssets } from "@/lib/site-assets";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

function LoginPage() {
  const { language } = useI18n();
  const ar = language === "ar";
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);

  const handleResendVerification = async () => {
    if (!email) return;
    setResendingVerification(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/login`,
      },
    });
    setResendingVerification(false);
    if (error) {
      toast.error(ar ? "فشل إعادة الإرسال" : "Failed to resend", {
        description: error.message,
      });
    } else {
      toast.success(
        ar
          ? "تم إرسال رابط التأكيد مجدداً، تحقق من بريدك"
          : "Verification link resent, check your inbox"
      );
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowVerificationPrompt(false);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      // Check if the error is email not confirmed
      if (
        error.message.toLowerCase().includes("email not confirmed") ||
        error.message.toLowerCase().includes("email_not_confirmed")
      ) {
        setShowVerificationPrompt(true);
        return;
      }
      toast.error(ar ? "فشل تسجيل الدخول" : "Login Failed", {
        description: ar
          ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
          : "Invalid email or password",
      });
    } else if (data?.user) {
      toast.success(ar ? "مرحباً بك مجدداً! 🌸" : "Welcome back! 🌸");
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      const metadata = data.user.user_metadata;
      const profileData = {
        id: data.user.id,
        email: data.user.email || email.trim().toLowerCase(),
        name: (metadata?.name || metadata?.full_name || existingProfile?.name || "").trim(),
        phone: (metadata?.phone || existingProfile?.phone || "").trim(),
        governorate: (metadata?.governorate || existingProfile?.governorate || "").trim(),
        address: (metadata?.address || existingProfile?.address || "").trim(),
      };

      const { data: prof, error: profileError } = await supabase
        .from("profiles")
        .upsert(profileData)
        .select("*")
        .maybeSingle();

      if (profileError) {
        console.warn("Profile sync after login failed:", profileError);
      }

      if (
        data.user.app_metadata?.provider === "google" &&
        (!prof || !prof.phone || !prof.governorate || !prof.address)
      ) {
        navigate({ to: "/auth/complete-profile" });
      } else {
        navigate({ to: "/account" });
      }
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/complete-profile`,
      },
    });
    if (error) {
      toast.error(
        ar ? "فشل تسجيل الدخول بجوجل" : "Google Login Failed",
        { description: error.message }
      );
    }
  };

  return (
    <div className="min-h-screen flex" dir={ar ? "rtl" : "ltr"}>
      {/* ── Left panel: decorative image ── */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        aria-hidden="true"
      >
        <img
          src={siteAssets.hero2}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1614]/70 via-[#8B6B4A]/40 to-[#1A1614]/60" />

        {/* Content over image */}
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16">
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-white/90 text-sm font-medium tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-[#D4B896]" />
              {ar ? "عطر يعكس شخصيتك" : "A scent that defines you"}
            </span>
          </div>
          <h2
            className="text-4xl font-serif text-white leading-tight mb-3"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {ar ? "مرحباً بعودتك" : "Welcome Back"}
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-xs">
            {ar
              ? "سجّل دخولك للوصول إلى طلباتك وحسابك الشخصي"
              : "Sign in to access your orders and personal account"}
          </p>

          {/* Decorative dots */}
          <div className="flex gap-1.5 mt-8">
            <div className="w-8 h-0.5 bg-[#D4B896] rounded-full" />
            <div className="w-2 h-0.5 bg-white/40 rounded-full" />
            <div className="w-2 h-0.5 bg-white/40 rounded-full" />
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
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

          {/* Logo / Brand */}
          <div className="mb-8 text-center">
            <Link to="/" className="inline-block">
              <img
                src={siteAssets.logo}
                alt="Perfume Note"
                className="h-12 mx-auto object-contain"
              />
            </Link>
            <h1
              className="mt-4 text-2xl font-serif text-foreground"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {ar ? "تسجيل الدخول" : "Sign In"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {ar
                ? "أدخل بياناتك للوصول إلى حسابك"
                : "Enter your details to access your account"}
            </p>
          </div>

          {/* Email not confirmed prompt */}
          {showVerificationPrompt && (
            <div className="mb-5 rounded-xl border border-[#D4B896]/50 bg-[#D4B896]/10 p-4 text-sm">
              <p className="font-semibold text-foreground mb-1">
                {ar
                  ? "⚠️ يرجى تأكيد بريدك الإلكتروني أولاً"
                  : "⚠️ Please verify your email first"}
              </p>
              <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
                {ar
                  ? "لم يتم تأكيد بريدك الإلكتروني بعد. تحقق من Inbox أو Spam الخاص بك."
                  : "Your email hasn't been confirmed yet. Check your inbox or spam folder."}
              </p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendingVerification}
                className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
              >
                {resendingVerification
                  ? ar
                    ? "جاري الإرسال..."
                    : "Sending..."
                  : ar
                    ? "أعد إرسال رابط التأكيد"
                    : "Resend verification link"}
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="login-email">
                {ar ? "البريد الإلكتروني" : "Email Address"}
              </label>
              <div className="relative">
                <Mail
                  className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none ${ar ? "right-3" : "left-3"}`}
                />
                <Input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`bg-background text-foreground ${ar ? "pr-10" : "pl-10"}`}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground" htmlFor="login-password">
                  {ar ? "كلمة المرور" : "Password"}
                </label>
                <Link
                  to="/auth/forgot-password"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {ar ? "نسيت كلمة المرور؟" : "Forgot password?"}
                </Link>
              </div>
              <div className="relative">
                <Lock
                  className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none ${ar ? "right-3" : "left-3"}`}
                />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`bg-background text-foreground ${ar ? "pr-10 pl-10" : "pl-10 pr-10"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors ${ar ? "left-3" : "right-3"}`}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-6 text-sm font-semibold tracking-wide hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {ar ? "جاري الدخول..." : "Signing in..."}
                </>
              ) : (
                <>
                  {ar ? "دخول" : "Sign In"}
                  <ArrowRight
                    className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${ar ? "rotate-180" : ""}`}
                  />
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground tracking-widest">
                  {ar ? "أو" : "or"}
                </span>
              </div>
            </div>

            {/* Google */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              className="w-full py-6 flex items-center justify-center gap-3 border-border hover:bg-secondary transition-colors text-sm font-medium"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {ar ? "الدخول باستخدام Google" : "Continue with Google"}
            </Button>
          </form>

          {/* Register link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {ar ? "ليس لديك حساب؟ " : "Don't have an account? "}
            <Link
              to="/auth/register"
              className="font-semibold text-primary hover:underline"
            >
              {ar ? "سجّل الآن" : "Register here"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

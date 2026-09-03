import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, RefreshCw, CheckCircle2, Inbox, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { siteAssets } from "@/lib/site-assets";
import { z } from "zod";

export const Route = createFileRoute("/auth/verify-email")({
  validateSearch: z.object({
    email: z.string().optional(),
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { language } = useI18n();
  const ar = language === "ar";
  const navigate = useNavigate();
  const { email } = Route.useSearch();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/login`,
      },
    });
    setResending(false);
    if (error) {
      toast.error(
        ar ? "فشل إعادة الإرسال" : "Failed to resend",
        { description: error.message }
      );
    } else {
      setResent(true);
      toast.success(ar ? "تم إرسال الرابط مجدداً!" : "Verification link resent!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-16" dir={ar ? "rtl" : "ltr"}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 text-center">
          <Link to="/" className="inline-block">
            <img
              src={siteAssets.logo}
              alt="Perfume Note"
              className="h-14 mx-auto object-contain"
            />
          </Link>
        </div>

        {/* Card */}
        <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          {/* Top decorative bar */}
          <div className="h-1 w-full bg-gradient-to-r from-[#8B6B4A] via-[#D4B896] to-[#8B6B4A]" />

          <div className="p-8 text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#D4B896]/15 border-2 border-[#D4B896]/30 mb-6 mx-auto relative">
              <Mail className="w-10 h-10 text-primary" />
              {/* Pulse ring */}
              <span className="absolute inset-0 rounded-full border-2 border-[#D4B896]/30 animate-ping opacity-40" />
            </div>

            <h1
              className="text-2xl font-serif text-foreground mb-2"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {ar ? "تحقق من بريدك الإلكتروني" : "Verify Your Email"}
            </h1>

            <p className="text-muted-foreground text-sm leading-relaxed mb-1">
              {ar
                ? "لقد أرسلنا رابط تأكيد إلى"
                : "We've sent a verification link to"}
            </p>
            {email && (
              <p className="font-semibold text-foreground text-sm mb-5">{email}</p>
            )}

            {/* Steps */}
            <div className="bg-secondary/50 rounded-xl p-4 mb-6 text-right space-y-3">
              {[
                {
                  icon: <Inbox className="w-4 h-4 text-primary shrink-0" />,
                  text: ar ? "افتح تطبيق Gmail أو بريدك الإلكتروني" : "Open Gmail or your email app",
                },
                {
                  icon: <Mail className="w-4 h-4 text-primary shrink-0" />,
                  text: ar
                    ? 'ابحث عن رسالة من "Perfume Note"'
                    : 'Look for an email from "Perfume Note"',
                },
                {
                  icon: <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />,
                  text: ar
                    ? 'اضغط على زر "تأكيد البريد الإلكتروني"'
                    : 'Click the "Confirm Email" button',
                },
              ].map((step, i) => (
                <div key={i} className={`flex items-center gap-3 ${ar ? "flex-row" : "flex-row-reverse text-left"}`}>
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 shrink-0">
                    {step.icon}
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              {ar
                ? "تحقق أيضاً من مجلد الرسائل غير المرغوب فيها (Spam)"
                : "Also check your spam or junk folder"}
            </p>

            {/* Resend button */}
            {!resent ? (
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={resending || !email}
                className="w-full py-5 border-border flex items-center justify-center gap-2 text-sm font-medium hover:bg-secondary transition-colors mb-4"
              >
                {resending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {ar ? "جاري الإرسال..." : "Sending..."}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    {ar ? "أعد إرسال رابط التأكيد" : "Resend verification link"}
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium mb-4 py-2">
                <CheckCircle2 className="w-4 h-4" />
                {ar ? "تم إرسال الرابط مجدداً!" : "Link resent successfully!"}
              </div>
            )}

            {/* Go to login */}
            <Button
              onClick={() => navigate({ to: "/auth/login" })}
              className="w-full bg-primary text-primary-foreground py-5 text-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group"
            >
              {ar ? "تسجيل الدخول" : "Go to Login"}
              <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${ar ? "rotate-180" : ""}`} />
            </Button>

            <p className="mt-5 text-xs text-muted-foreground">
              {ar ? "بعد التأكيد، عد هنا وسجّل دخولك" : "After confirming, come back here and sign in"}
            </p>
          </div>
        </div>

        {/* Back to home */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="text-primary hover:underline font-medium">
            {ar ? "العودة للصفحة الرئيسية" : "Back to Home"}
          </Link>
        </p>
      </div>
    </div>
  );
}

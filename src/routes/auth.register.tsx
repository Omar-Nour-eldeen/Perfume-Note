import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { language } = useI18n();
  const ar = language === "ar";
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/account`
      }
    });
    if (error) {
      toast.error(ar ? "فشل التسجيل بجوجل" : "Google Sign Up Failed", {
        description: error.message,
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone with regex
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone.trim())) {
      toast.error(ar ? "يرجى إدخال رقم هاتف صحيح (10-15 أرقام فقط)" : "Please enter a valid phone number (10-15 digits only)");
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone,
        },
      },
    });
    setLoading(false);

    if (error) {
      toast.error(ar ? "فشل إنشاء الحساب" : "Registration Failed", {
        description: error.message,
      });
    } else {
      toast.success(
        ar
          ? "تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني."
          : "Account created successfully! Please verify your email."
      );
      navigate({ to: "/auth/login" });
    }
  };

  return (
    <StoreLayout>
      <main className="mx-auto max-w-md px-4 pt-28 pb-16">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-black text-center text-foreground mb-6">
            {ar ? "إنشاء حساب جديد" : "Create Account"}
          </h1>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1">
                {ar ? "الاسم الكامل" : "Full Name"}
              </label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1">
                {ar ? "رقم الهاتف" : "Phone Number"}
              </label>
              <Input
                type="tel"
                required
                maxLength={11}
                pattern="01[0-5][0-9]{8}"
                value={phone}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, '');
                  val = val.slice(0, 11);
                  setPhone(val);
                }}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  const phoneRegex = /^01[0-5][0-9]{8}$/;
                  
                  if (val && !phoneRegex.test(val)) {
                    toast.error(ar ? "رقم مصري غير صحيح (01X XXXXXXXX)" : "Invalid Egyptian phone (01X XXXXXXXX)");
                    setPhone("");
                    return;
                  }
                }}
                inputMode="numeric"
                title="رقم مصري (01[0-5] رلم 8 أرقام)"
                placeholder="01001234567"
                className="bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1">
                {ar ? "البريد الإلكتروني" : "Email Address"}
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1">
                {ar ? "كلمة المرور" : "Password"}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`bg-background text-foreground ${ar ? "pl-10" : "pr-10"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground ${ar ? "left-3" : "right-3"}`}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary text-white py-6">
              {loading ? (ar ? "جاري الإنشاء..." : "Creating...") : (ar ? "تسجيل" : "Register")}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {ar ? "أو" : "Or"}
                </span>
              </div>
            </div>

            <Button type="button" variant="outline" onClick={handleGoogleLogin} className="w-full py-6 flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {ar ? "التسجيل باستخدام جوجل" : "Sign up with Google"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {ar ? "لديك حساب بالفعل؟" : "Already have an account?"}{" "}
            </span>
            <Link to="/auth/login" className="font-bold text-primary hover:underline">
              {ar ? "تسجيل الدخول" : "Login here"}
            </Link>
          </div>
        </div>
      </main>
    </StoreLayout>
  );
}

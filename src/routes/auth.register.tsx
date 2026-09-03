import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin, Home, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { siteAssets } from "@/lib/site-assets";

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
});

const EGYPT_GOVERNORATES_AR = [
  "القاهرة", "الإسكندرية", "الجيزة", "الشرقية", "الدقهلية",
  "البحيرة", "المنوفية", "القليوبية", "الغربية", "كفر الشيخ",
  "دمياط", "بورسعيد", "الإسماعيلية", "السويس", "شمال سيناء",
  "جنوب سيناء", "الفيوم", "بني سويف", "المنيا", "أسيوط",
  "سوهاج", "قنا", "الأقصر", "أسوان", "البحر الأحمر",
  "الوادي الجديد", "مطروح",
];

const EGYPT_GOVERNORATES_EN = [
  "Cairo", "Alexandria", "Giza", "Sharqia", "Dakahlia",
  "Beheira", "Monufia", "Qalyubia", "Gharbia", "Kafr El Sheikh",
  "Damietta", "Port Said", "Ismailia", "Suez", "North Sinai",
  "South Sinai", "Faiyum", "Beni Suef", "Minya", "Asyut",
  "Sohag", "Qena", "Luxor", "Aswan", "Red Sea",
  "New Valley", "Matruh",
];

function RegisterPage() {
  const { language } = useI18n();
  const ar = language === "ar";
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/complete-profile`,
      },
    });
    if (error) {
      toast.error(ar ? "فشل التسجيل بجوجل" : "Google Sign Up Failed", {
        description: error.message,
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone with Egyptian format
    const phoneRegex = /^01[0-5][0-9]{8}$/;
    if (!phoneRegex.test(phone.trim())) {
      toast.error(
        ar
          ? "يرجى إدخال رقم هاتف مصري صحيح (01X XXXXXXXX)"
          : "Please enter a valid Egyptian phone number (01X XXXXXXXX)"
      );
      return;
    }

    if (!governorate) {
      toast.error(ar ? "يرجى اختيار المحافظة" : "Please select your governorate");
      return;
    }

    if (!address.trim()) {
      toast.error(ar ? "يرجى إدخال العنوان التفصيلي" : "Please enter your address");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/login`,
        data: {
          name,
          phone,
          governorate,
          address,
        },
      },
    });

    if (data?.user && data.user.identities?.length === 0) {
      setLoading(false);
      toast.error(
        ar ? "هذا البريد مسجل بالفعل" : "This email is already registered",
        { description: ar ? "استخدم تسجيل الدخول أو اطلب إعادة إرسال رابط التأكيد" : "Sign in or resend the verification email" }
      );
      return;
    }

    if (data?.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        name: name.trim(),
        phone: phone.trim(),
        governorate: governorate.trim(),
        address: address.trim(),
      });

      if (profileError) {
        console.warn("Profile setup failed after registration:", profileError);
      }
    }

    setLoading(false);

    if (error) {
      toast.error(ar ? "فشل إنشاء الحساب" : "Registration Failed", {
        description: error.message,
      });
    } else {
      // Keep the user informed while they confirm the email.
      navigate({
        to: "/auth/verify-email",
        search: { email },
      });
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
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1614]/70 via-[#8B6B4A]/40 to-[#1A1614]/60" />
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16">
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-white/90 text-sm font-medium tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-[#D4B896]" />
              {ar ? "انضم لعالم العطور الفاخرة" : "Join the world of luxury fragrances"}
            </span>
          </div>
          <h2
            className="text-4xl font-serif text-white leading-tight mb-3"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {ar ? "أنشئ حسابك" : "Create Your Account"}
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-xs">
            {ar
              ? "سجّل الآن واستمتع بتجربة تسوق استثنائية مع عروض حصرية لأعضائنا"
              : "Register now and enjoy an exceptional shopping experience with exclusive member offers"}
          </p>
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
              {ar ? "إنشاء حساب جديد" : "Create Account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {ar
                ? "أدخل بياناتك لإنشاء حسابك"
                : "Enter your details to create your account"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="reg-name">
                {ar ? "الاسم الكامل" : "Full Name"}
              </label>
              <div className="relative">
                <User
                  className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none ${ar ? "right-3" : "left-3"}`}
                />
                <Input
                  id="reg-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={ar ? "محمد أحمد" : "John Doe"}
                  className={`bg-background text-foreground ${ar ? "pr-10" : "pl-10"}`}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="reg-phone">
                {ar ? "رقم الهاتف" : "Phone Number"}
              </label>
              <div className="relative">
                <Phone
                  className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none ${ar ? "right-3" : "left-3"}`}
                />
                <Input
                  id="reg-phone"
                  type="tel"
                  required
                  maxLength={11}
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setPhone(val);
                  }}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    const phoneRegex = /^01[0-5][0-9]{8}$/;
                    if (val && !phoneRegex.test(val)) {
                      toast.error(
                        ar
                          ? "رقم مصري غير صحيح (01X XXXXXXXX)"
                          : "Invalid Egyptian phone (01X XXXXXXXX)"
                      );
                      setPhone("");
                    }
                  }}
                  inputMode="numeric"
                  placeholder="01001234567"
                  className={`bg-background text-foreground ${ar ? "pr-10" : "pl-10"}`}
                />
              </div>
            </div>

            {/* Governorate */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="reg-governorate">
                {ar ? "المحافظة" : "Governorate"}
              </label>
              <div className="relative">
                <MapPin
                  className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10 ${ar ? "right-3" : "left-3"}`}
                />
                <select
                  id="reg-governorate"
                  required
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className={`w-full h-10 rounded-md border border-input bg-background text-foreground text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none ${ar ? "pr-10 pl-4" : "pl-10 pr-4"}`}
                  style={{ direction: ar ? "rtl" : "ltr" }}
                >
                  <option value="">
                    {ar ? "اختر المحافظة..." : "Select governorate..."}
                  </option>
                  {(ar ? EGYPT_GOVERNORATES_AR : EGYPT_GOVERNORATES_EN).map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="reg-address">
                {ar ? "العنوان التفصيلي" : "Detailed Address"}
              </label>
              <div className="relative">
                <Home
                  className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none ${ar ? "right-3" : "left-3"}`}
                />
                <Input
                  id="reg-address"
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={ar ? "شارع النيل، عمارة 5، شقة 3" : "5 Nile St, Bldg 5, Apt 3"}
                  className={`bg-background text-foreground ${ar ? "pr-10" : "pl-10"}`}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="reg-email">
                {ar ? "البريد الإلكتروني" : "Email Address"}
              </label>
              <div className="relative">
                <Mail
                  className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none ${ar ? "right-3" : "left-3"}`}
                />
                <Input
                  id="reg-email"
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
              <label className="text-sm font-medium text-foreground" htmlFor="reg-password">
                {ar ? "كلمة المرور" : "Password"}
              </label>
              <div className="relative">
                <Lock
                  className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none ${ar ? "right-3" : "left-3"}`}
                />
                <Input
                  id="reg-password"
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
              className="w-full bg-primary text-primary-foreground py-6 text-sm font-semibold tracking-wide hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group mt-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {ar ? "جاري الإنشاء..." : "Creating..."}
                </>
              ) : (
                <>
                  {ar ? "إنشاء الحساب" : "Create Account"}
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
              {ar ? "التسجيل باستخدام Google" : "Sign up with Google"}
            </Button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {ar ? "لديك حساب بالفعل؟ " : "Already have an account? "}
            <Link
              to="/auth/login"
              className="font-semibold text-primary hover:underline"
            >
              {ar ? "تسجيل الدخول" : "Login here"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

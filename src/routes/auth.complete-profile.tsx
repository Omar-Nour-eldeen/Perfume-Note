import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User, Phone, MapPin, Home, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { siteAssets } from "@/lib/site-assets";

export const Route = createFileRoute("/auth/complete-profile")({
  component: CompleteProfilePage,
});

import { EGYPT_GOVERNORATES } from "@/lib/governorates";

function CompleteProfilePage() {
  const { language } = useI18n();
  const ar = language === "ar";
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    // If not logged in, redirect to login
    if (!user) {
      navigate({ to: "/auth/login" });
      return;
    }

    // If profile is already complete, redirect to account
    if (profile) {
      const isComplete =
        profile.name &&
        profile.phone &&
        profile.governorate &&
        profile.address;

      if (isComplete) {
        navigate({ to: "/account" });
        return;
      }

      // Pre-fill whatever we already have
      const googleName = (user.user_metadata?.full_name || user.user_metadata?.name) as string | undefined;
      setName(profile.name || googleName || "");
      setPhone(profile.phone || "");
      setGovernorate(profile.governorate || "");
      setAddress(profile.address || "");
    }

    setChecking(false);
  }, [user, profile, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone
    const phoneRegex = /^01[0-5][0-9]{8}$/;
    if (!phoneRegex.test(phone.trim())) {
      toast.error(
        ar
          ? "يرجى إدخال رقم هاتف مصري صحيح (01X XXXXXXXX)"
          : "Please enter a valid Egyptian phone number"
      );
      return;
    }

    if (!governorate) {
      toast.error(ar ? "يرجى اختيار المحافظة" : "Please select your governorate");
      return;
    }

    if (!address.trim()) {
      toast.error(ar ? "يرجى إدخال العنوان" : "Please enter your address");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user!.id,
          email: user!.email || "",
          name: name.trim(),
          phone: phone.trim(),
          governorate: governorate.trim(),
          address: address.trim(),
        })
        .eq("id", user!.id);

      if (error) throw error;

      await refreshProfile();
      toast.success(ar ? "تم حفظ بياناتك بنجاح! 🎉" : "Profile completed! 🎉");
      navigate({ to: "/account" });
    } catch (err) {
      console.error(err);
      toast.error(ar ? "حدث خطأ أثناء الحفظ" : "Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const governorateList = EGYPT_GOVERNORATES.map((governorate) =>
    ar ? governorate.ar : governorate.en
  );

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
              {ar ? "خطوة أخيرة" : "One Last Step"}
            </span>
          </div>
          <h2
            className="text-4xl font-serif text-white leading-tight mb-3"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {ar ? "أكمل بياناتك" : "Complete Your Profile"}
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-xs">
            {ar
              ? "نحتاج بعض البيانات الإضافية لتوصيل طلباتك وتحسين تجربتك"
              : "We need a few more details to deliver your orders and improve your experience"}
          </p>

          {/* Feature list */}
          <div className="mt-8 space-y-3">
            {[
              ar ? "توصيل سريع لباب بيتك" : "Fast delivery to your door",
              ar ? "تتبع طلباتك بسهولة" : "Track your orders easily",
              ar ? "عروض حصرية للأعضاء" : "Exclusive member offers",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4B896] shrink-0" />
                <span className="text-white/80 text-sm">{item}</span>
              </div>
            ))}
          </div>

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
            <h1
              className="mt-4 text-2xl font-serif text-foreground"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {ar ? "أكمل بياناتك" : "Complete Your Profile"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {ar
                ? "هذه البيانات ضرورية لإتمام عمليات الشراء والتوصيل"
                : "This info is needed to complete purchases and deliveries"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="cp-name">
                {ar ? "الاسم الكامل" : "Full Name"}
              </label>
              <div className="relative">
                <User
                  className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none ${ar ? "right-3" : "left-3"}`}
                />
                <Input
                  id="cp-name"
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
              <label className="text-sm font-medium text-foreground" htmlFor="cp-phone">
                {ar ? "رقم الهاتف" : "Phone Number"}
              </label>
              <div className="relative">
                <Phone
                  className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none ${ar ? "right-3" : "left-3"}`}
                />
                <Input
                  id="cp-phone"
                  type="tel"
                  required
                  maxLength={11}
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setPhone(val);
                  }}
                  inputMode="numeric"
                  placeholder="01001234567"
                  className={`bg-background text-foreground ${ar ? "pr-10" : "pl-10"}`}
                />
              </div>
            </div>

            {/* Governorate */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="cp-governorate">
                {ar ? "المحافظة" : "Governorate"}
              </label>
              <div className="relative">
                <MapPin
                  className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10 ${ar ? "right-3" : "left-3"}`}
                />
                <select
                  id="cp-governorate"
                  required
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className={`w-full h-10 rounded-md border border-input bg-background text-foreground text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none ${ar ? "pr-10 pl-4" : "pl-10 pr-4"}`}
                  style={{ direction: ar ? "rtl" : "ltr" }}
                >
                  <option value="">
                    {ar ? "اختر المحافظة..." : "Select governorate..."}
                  </option>
                  {governorateList.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="cp-address">
                {ar ? "العنوان التفصيلي" : "Detailed Address"}
              </label>
              <div className="relative">
                <Home
                  className={`absolute top-3 h-4 w-4 text-muted-foreground pointer-events-none ${ar ? "right-3" : "left-3"}`}
                />
                <textarea
                  id="cp-address"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={
                    ar
                      ? "مثال: شارع النيل، عمارة 5، شقة 3"
                      : "e.g., 5 Nile St, Building 5, Apt 3"
                  }
                  rows={3}
                  className={`w-full rounded-md border border-input bg-background text-foreground text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none py-2 ${ar ? "pr-10 pl-3" : "pl-10 pr-3"}`}
                />
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-primary text-primary-foreground py-6 text-sm font-semibold tracking-wide hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group mt-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {ar ? "جاري الحفظ..." : "Saving..."}
                </>
              ) : (
                <>
                  {ar ? "حفظ وإكمال" : "Save & Continue"}
                  <ArrowRight
                    className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${ar ? "rotate-180" : ""}`}
                  />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

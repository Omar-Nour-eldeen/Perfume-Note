import { useI18n } from "@/lib/i18n";
import {Truck, ShieldCheck, Sparkles, Clock3} from "lucide-react";
const benefits = [
  {
    icon: Truck,
    title_en: "Fast Shipping",
    title_ar: "شحن سريع",
    desc_en: "Reliable and fast delivery straight to your door.",
    desc_ar: "توصيل سريع وموثوق مباشرة إلى باب منزلك.",
  },
  {
    icon: ShieldCheck,
    title_en: "Secure Payment",
    title_ar: "دفع آمن",
    desc_en: "Your transactions are protected with secure payment methods.",
    desc_ar: "معاملاتك محمية بالكامل باستخدام طرق دفع آمنة.",
  },
  {
    icon: Sparkles,
    title_en: "Exceptional Quality",
    title_ar: "جودة استثنائية",
    desc_en: "Premium fragrances carefully selected for exceptional quality.",
    desc_ar: "عطور فاخرة مختارة بعناية لضمان أعلى جودة.",
  },
  {
    icon: Clock3,
    title_en: "Long-Lasting Fragrance",
    title_ar: "روائح تدوم طويلاً",
    desc_en: "Luxurious scents crafted to leave a lasting impression.",
    desc_ar: "روائح فاخرة مصممة لتدوم وتترك انطباعًا مميزًا.",
  },
];

export function Benefits() {
  const { language } = useI18n();
  const ar = language === "ar";

  return (
    <section className="pb-16 pt-8 md:pb-24 bg-[#f8f5f0]">
      <div className="max-w-screen-xl mx-auto px-6 md:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          {benefits.map((b, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-4">
              <span className="text-[#A68A6B]">
                <b.icon className="w-6 h-6" strokeWidth={1.5} />
              </span>

              <h4
                className={`text-xs font-bold text-black/80 ${
                  ar ? "font-['Tajawal']" : "tracking-[0.15em] uppercase"
                }`}
              >
                {ar ? b.title_ar : b.title_en}
              </h4>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

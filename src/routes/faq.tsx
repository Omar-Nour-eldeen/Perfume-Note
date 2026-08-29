import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/StoreLayout";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "الأسئلة الشائعة — PERFUME NOTE" },
      { name: "description", content: "إجابات على أكثر الأسئلة شيوعاً حول طلباتك وعطورك" },
    ],
  }),
  component: FaqPage,
});

const faqs_ar = [
  {
    q: "كيف أعرف أي عطر يناسبني؟",
    a: "يمكنك استخدام اختبار \"اكتشف عطرك\" الموجود في الموقع، وهو اختبار بسيط يسألك عن تفضيلاتك ومناسباتك لتقترح عليك أنسب العطور بناءً على ذلك.",
  },
  {
    q: "هل يمكنني إرجاع العطر إذا لم يعجبني؟",
    a: "نعم، نقبل الإرجاع خلال 7 أيام من تاريخ الاستلام شريطة أن يكون المنتج غير مستخدم، في حالته الأصلية, لمزيد من التفاصيل، راجع صفحة الإرجاع.",
  },
  {
    q: "كم يستغرق التوصيل؟",
    a: "يستغرق التوصيل عادةً من 2 إلى 5 أيام عمل داخل مصر. وقد يختلف الوقت حسب المنطقة الجغرافية. راجع صفحة الشحن لمزيد من التفاصيل.",
  },
  {
    q: "هل يوجد حد أدنى للطلب؟",
    a: "لا يوجد حد أدنى للطلب. يمكنك طلب منتج واحد وسيصلك بنفس الاهتمام والتعبئة المميزة.",
  },
  {
    q: "كيف أتابع طلبي؟",
    a: "بعد تأكيد طلبك، يمكنك متابعة حالة الطلب من خلال طلباتك في حسابك على الموقع. كما سنتواصل معك عند تحديث حالة الطلب أو خروجه للتوصيل.",
  },
];

const faqs_en = [
  {
    q: "How do I find the right fragrance for me?",
    a: "Use our \"Find Your Scent\" quiz on the website. It's a simple questionnaire about your preferences and occasions to recommend the most suitable fragrances for you.",
  },
  {
    q: "Can I return a fragrance if I don't like it?",
    a: "Yes, we accept returns within 7 days of receipt, provided the product is unused, and in its original condition, See our Returns page for details.",
  },
  {
    q: "How long does delivery take?",
    a: "Delivery typically takes 2–5 business days within Egypt. Times may vary by region. See our Shipping page for full details.",
  },
  {
    q: "Is there a minimum order?",
    a: "No minimum order required. You can order a single product and it will be delivered with the same care and premium packaging.",
  },
  {
    q: "How do I track my order?",
    a: "After your order is confirmed, you can check its status from your orders in your account on the website. We will also contact you when your order status is updated or when it is out for delivery.",
  },
];

function FaqPage() {
  const { language } = useI18n();
  const ar = language === "ar";
  const faqs = ar ? faqs_ar : faqs_en;

  return (
    <StoreLayout>
      <section className={`min-h-screen bg-background py-20 ${ar ? "rtl" : "ltr"}`}>
        <div className="max-w-2xl mx-auto px-6">
          {/* Header */}
          <div className="mb-14">
            <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3">
              {ar ? "المساعدة" : "Help"}
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
              {ar ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
            </h1>
            <div className="w-12 h-px bg-foreground/30 mt-6" />
          </div>

          {/* Q&A */}
          <div className="flex flex-col gap-10">
            {faqs.map((item, i) => (
              <div key={i} className="flex flex-col gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  {ar ? `${i + 1}. ${item.q}` : `${i + 1}. ${item.q}`}
                </h2>
                <p className="text-sm text-muted-foreground leading-7">{item.a}</p>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-16 border-t border-border/40 pt-8">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {ar
                ? "لم تجد إجابة لسؤالك؟ تواصل معنا عبر الدردشة المباشرة أو عبر وسائل التواصل الاجتماعي وسنرد عليك في أقرب وقت."
                : "Didn't find an answer? Reach us via live chat or social media and we'll get back to you shortly."}
            </p>
          </div>
        </div>
      </section>
    </StoreLayout>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/StoreLayout";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/shipping")({
  head: () => ({
    meta: [
      { title: "الشحن والتوصيل — PERFUME NOTE" },
      { name: "description", content: "تعرف على سياسة الشحن والتوصيل لدى PERFUME NOTE" },
    ],
  }),
  component: ShippingPage,
});

function ShippingPage() {
  const { language } = useI18n();
  const ar = language === "ar";

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
              {ar ? "الشحن والتوصيل" : "Shipping & Delivery"}
            </h1>
            <div className="w-12 h-px bg-foreground/30 mt-6" />
          </div>

          {/* Content */}
          <div className="flex flex-col gap-10 text-sm text-muted-foreground leading-8">

            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">{ar ? "مناطق التوصيل" : "Delivery Areas"}</h2>
              <p>
                {ar
                  ? "نوصّل حالياً لجميع محافظات جمهورية مصر العربية. قد تختلف أوقات التوصيل وتكاليفه حسب الموقع الجغرافي."
                  : "We currently deliver to all governorates across Egypt. Delivery times and costs may vary depending on your location."}
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">{ar ? "مدة التوصيل" : "Delivery Time"}</h2>
              <p>
                {ar
                  ? "يتراوح وقت التوصيل عادةً بين يومين و5 أيام عمل من تاريخ تأكيد الطلب. تُعدّ أيام الجمعة والعطلات الرسمية خارج نطاق أيام العمل."
                  : "Delivery typically takes 2–5 business days from the date of order confirmation. Fridays and public holidays are not counted as business days."}
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">{ar ? "تكاليف الشحن" : "Shipping Costs"}</h2>
              <p>
                {ar
                  ? "تُحسب تكاليف الشحن بناءً على موقعك الجغرافي وستظهر لك بشكل واضح عند إتمام الطلب قبل الدفع."
                  : "Shipping costs are calculated based on your location and will be clearly shown at checkout before payment."}
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">{ar ? "تتبع الشحنة" : "Order Tracking"}</h2>
              <p>
                {ar
                  ? "يمكنك متابعة حالة طلبك بسهولة من خلال حسابك على الموقع. سنقوم بتحديث حالة الطلب في كل مرحلة، من تأكيد الطلب وحتى خروجه للتوصيل."
                  : "You can easily track your order status through your account on our website. We’ll keep you updated at every stage, from order confirmation to delivery."}
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">{ar ? "في حالة التأخير" : "In Case of Delay"}</h2>
              <p>
                {ar
                  ? "إذا تأخر طلبك عن الوقت المحدد، يُرجى التواصل معنا مباشرةً عبر الدردشة المباشرة أو وسائل التواصل الاجتماعي وسنتابع الأمر فوراً."
                  : "If your order is delayed beyond the expected time, please contact us directly via live chat or social media and we'll follow up immediately."}
              </p>
            </div>
          </div>
        </div>
      </section>
    </StoreLayout>
  );
}

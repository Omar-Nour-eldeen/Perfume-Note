import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/StoreLayout";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: "الإرجاع والاستبدال — PERFUME NOTE" },
      { name: "description", content: "تعرف على سياسة الإرجاع والاستبدال لدى PERFUME NOTE" },
    ],
  }),
  component: ReturnsPage,
});

function ReturnsPage() {
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
              {ar ? "الإرجاع والاستبدال" : "Returns & Exchanges"}
            </h1>
            <div className="w-12 h-px bg-foreground/30 mt-6" />
          </div>

          {/* Content */}
          <div className="flex flex-col gap-10 text-sm text-muted-foreground leading-8">

            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">{ar ? "شروط الإرجاع" : "Return Conditions"}</h2>
              <p>
                {ar
                  ? "نقبل طلبات الإرجاع خلال 7 أيام من تاريخ الاستلام، شريطة أن يكون المنتج:"
                  : "We accept return requests within 7 days of receipt, provided the product is:"}
              </p>
              <ul className={`mt-3 flex flex-col gap-2 ${ar ? "pr-4" : "pl-4"} list-disc`}>
                <li>{ar ? "غير مستخدم وفي حالته الأصلية" : "Unused and in its original condition"}</li>
                <li>{ar ? "في عبوته الأصلية" : "In its original packaging"}</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">{ar ? "حالات عدم القبول" : "Non-Returnable Cases"}</h2>
              <p>
                {ar
                  ? "لا يُقبل الإرجاع في الحالات التالية:"
                  : "Returns are not accepted in the following cases:"}
              </p>
              <ul className={`mt-3 flex flex-col gap-2 ${ar ? "pr-4" : "pl-4"} list-disc`}>
                <li>{ar ? "مرور أكثر من 7 أيام على تاريخ الاستلام" : "More than 7 days have passed since receipt"}</li>
                <li>{ar ? "استخدام المنتج" : "Product has been used"}</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">{ar ? "كيفية طلب الإرجاع" : "How to Request a Return"}</h2>
              <p>
                {ar
                  ? "لبدء طلب الإرجاع، انتقل إلى طلباتي من حسابك على الموقع واختر الطلب الذي ترغب في إرجاعه. قم بتقديم طلب الإرجاع مع توضيح السبب وإرفاق صورة للمنتج. بعد ذلك، سيتواصل معك فريق الدعم لاستكمال إجراءات الإرجاع وترتيب عملية الاستلام."
                  : "To start a return request, go to My Orders in your account and select the order you’d like to return. Submit your return request, provide the reason, and upload a photo of the product. Our support team will then contact you to complete the return process and arrange the pickup."}
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">{ar ? "استرداد المبلغ" : "Refund"}</h2>
              <p>
                {ar
                  ? "بعد استلام المنتج والتحقق منه، يتم إضافة قيمة المبلغ المستحق إلى محفظتك في الموقع. يمكنك استخدام رصيد المحفظة بالكامل أو جزء منه عند إجراء طلب جديد، وسيظهر لك خيار استخدام رصيد المحفظة أثناء إتمام الطلب."
                  : "After receiving and inspecting the returned product, the eligible refund amount will be added to your wallet balance on our website. You can use all or part of your wallet balance on a future order, with the option to apply your balance during checkout."}
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">{ar ? "الاستبدال" : "Exchanges"}</h2>
              <p>
                {ar
                  ? "لا نوفر خدمة الاستبدال المباشر للمنتجات. في حال رغبتك في تغيير المنتج، يمكنك طلب إرجاع المنتج أولًا وفقًا لسياسة الإرجاع، ثم إنشاء طلب جديد بالمنتج الذي ترغب به."
                  : "We do not offer direct product exchanges. If you wish to change your product, you can request a return first according to our return policy, then place a new order for the product you want."}
              </p>
            </div>
          </div>
        </div>
      </section>
    </StoreLayout>
  );
}

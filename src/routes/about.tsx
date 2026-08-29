import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/StoreLayout";
import { BrandStorySection } from "@/components/BrandStorySection";
import { Benefits } from "@/components/Benefits";
import { NewsletterSection } from "@/components/NewsletterSection";
import { PageHero } from "@/components/PageHero";
import { useI18n } from "@/lib/i18n";
import heroAbout from "@/assets/images/hero_about.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "عنا — PERFUME NOTE" },
      { name: "description", content: "تعرف على قصة PERFUME NOTE وفلسفتنا في عالم العطور الفاخرة" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { language } = useI18n();
  const ar = language === "ar";

  return (
    <StoreLayout>

      <PageHero
        eyebrow={ar ? "من نحن" : "WHO WE ARE"}
        title={ar ? "قصتنا" : "Our Story"}
        subtitle={
          ar
            ? "من جوف الفلاحات إلى قلوب المدن — عطور تحكي قصتك"
            : "From the heart of the orchards to the heart of the city — fragrances that tell your story"
        }
        image={heroAbout}
        overlay={0.5}
      />

      {/* Brand Story */}
      <BrandStorySection />

      {/* Values */}
      <Benefits />

      {/* Values Extra */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-screen-xl mx-auto px-6 md:px-10">
          <div className={`grid md:grid-cols-3 gap-10 text-start`}>
            {[
              {
                icon: "✦",
                title_ar: "رؤيتنا",
                title_en: "Our Vision",
                desc_ar: "أن نكون الوجهة الأولى للعطور الفاخرة في المنطقة العربية، ونقدم تجربة تسوق استثنائية تجمع بين الأصالة والعصرية.",
                desc_en: "To be the premier destination for luxury fragrances in the Arab world, offering an exceptional shopping experience that bridges heritage and modernity.",
              },
              {
                icon: "◆",
                title_ar: "مهمتنا",
                title_en: "Our Mission",
                desc_ar: "نختار عطورنا بعناية شديدة من أرقى دور العطور العالمية، ونضمن أن كل قطرة تحمل قصة فريدة وجودة لا تُضاهى.",
                desc_en: "We carefully curate our fragrances from the world's finest perfume houses, ensuring every drop carries a unique story and unmatched quality.",
              },
              {
                icon: "◎",
                title_ar: "قيمنا",
                title_en: "Our Values",
                desc_ar: "الأصالة، الجودة، الابتكار، وخدمة العملاء بأعلى مستوى — هذه هي القيم التي تحكم كل ما نقدمه.",
                desc_en: "Authenticity, quality, innovation, and exceptional customer service — these are the values that govern everything we do.",
              },
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-4">
                <span className="text-3xl text-primary/50">{item.icon}</span>
                <h3 className={`text-xl font-semibold text-foreground ${ar ? "font-['Tajawal']" : "font-serif"}`}>
                  {ar ? item.title_ar : item.title_en}
                </h3>
                <p className={`text-sm text-muted-foreground leading-relaxed ${ar ? "font-['Tajawal']" : ""}`}>
                  {ar ? item.desc_ar : item.desc_en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <NewsletterSection />
    </StoreLayout>
  );
}



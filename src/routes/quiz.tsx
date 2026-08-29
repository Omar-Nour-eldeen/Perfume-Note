import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/StoreLayout";
import { QuizSection } from "@/components/QuizSection";
import { PageHero } from "@/components/PageHero";
import { useI18n } from "@/lib/i18n";
import heroQuiz from "@/assets/images/hero_quiz.jpg";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "اكتشف عطرك — PERFUME NOTE" },
      { name: "description", content: "أجب عن بعض الأسئلة لاكتشاف العطر الذي يناسب شخصيتك" },
    ],
  }),
  component: QuizPage,
});

function QuizPage() {
  const { language } = useI18n();
  const ar = language === "ar";

  return (
    <StoreLayout>

      <PageHero
        eyebrow={ar ? "اختبار العطور" : "FRAGRANCE QUIZ"}
        title={ar ? "اكتشف عطرك المثالي" : "Find Your Perfect Scent"}
        subtitle={
          ar
            ? "أجب عن بعض الأسئلة البسيطة لنساعدك في اختيار العطر الذي يعكس شخصيتك"
            : "Answer a few simple questions and we'll help you find the fragrance that reflects your personality"
        }
        image={heroQuiz}
        overlay={0.55}
      />

      {/* Quiz */}
      <QuizSection />

    </StoreLayout>
  );
}


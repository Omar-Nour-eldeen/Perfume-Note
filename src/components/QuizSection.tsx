import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "./ui/button";

const quizQuestions = [
  {
    id: 1,
    question_en: "What is your favorite time of day?",
    question_ar: "ما هو وقتك المفضل في اليوم؟",
    options: [
      { id: "morning", text_en: "Early Morning", text_ar: "الصباح الباكر", category: "fresh" },
      { id: "evening", text_en: "Late Evening", text_ar: "المساء المتأخر", category: "oriental" },
      { id: "afternoon", text_en: "Sunny Afternoon", text_ar: "عصر مشمس", category: "floral" },
      { id: "night", text_en: "Midnight", text_ar: "منتصف الليل", category: "woody" },
    ]
  },
  {
    id: 2,
    question_en: "What feeling do you want your perfume to evoke?",
    question_ar: "ما هو الشعور الذي تريده من عطرك؟",
    options: [
      { id: "confidence", text_en: "Confidence & Power", text_ar: "الثقة والقوة", category: "woody" },
      { id: "romance", text_en: "Romance & Elegance", text_ar: "الرومانسية والأناقة", category: "floral" },
      { id: "energy", text_en: "Energy & Freshness", text_ar: "الطاقة والانتعاش", category: "fresh" },
      { id: "mystery", text_en: "Mystery & Allure", text_ar: "الغموض والجاذبية", category: "oriental" },
    ]
  },
  {
    id: 3,
    question_en: "Where would you wear this fragrance?",
    question_ar: "أين تفضل ارتداء هذا العطر؟",
    options: [
      { id: "work", text_en: "At the Office", text_ar: "في العمل", category: "fresh" },
      { id: "date", text_en: "On a Date", text_ar: "في موعد غرامي", category: "floral" },
      { id: "party", text_en: "At a Special Event", text_ar: "في مناسبة خاصة", category: "oriental" },
      { id: "everywhere", text_en: "Everyday Signature", text_ar: "بشكل يومي", category: "woody" },
    ]
  }
];

export function QuizSection() {
  const { language } = useI18n();
  const ar = language === "ar";
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [winningCategory, setWinningCategory] = useState<string | null>(null);

  const { data: recommendedProduct, isLoading } = useQuery({
    queryKey: ["recommendedProduct", winningCategory],
    queryFn: async () => {
      if (!winningCategory) return null;
      // In a real scenario, categories would have IDs matching these, or we filter based on metadata
      // For this static demo, we will just pick a random product, or if you have specific logic, put it here.
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .single();
      
      if (error) {
        console.error("Error fetching recommended product", error);
        return null;
      }
      return data;
    },
    enabled: !!winningCategory,
  });

  const handleAnswer = (category: string) => {
    const newAnswers = [...answers, category];
    setAnswers(newAnswers);

    if (currentStep < quizQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Calculate winner
      const counts = newAnswers.reduce((acc, cat) => {
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const winner = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      setWinningCategory(winner);
      setShowResult(true);
    }
  };

  const resetQuiz = () => {
    setCurrentStep(0);
    setAnswers([]);
    setShowResult(false);
    setWinningCategory(null);
  };

  return (
    <section id="quiz" className="py-20 md:py-28 bg-secondary/30 relative overflow-hidden">
      <div className="max-w-screen-md mx-auto px-6 md:px-10 text-center relative z-10">
        
        {!showResult ? (
          <div className="animate-fade-up">
            <p className="text-xs font-bold tracking-widest uppercase text-primary mb-4">
              {ar ? "اكتشف عطرك" : "FIND YOUR FRAGRANCE"}
            </p>
            <h2 className={`text-3xl md:text-5xl mb-12 text-foreground ${ar ? "font-['Tajawal'] font-bold" : "font-serif"}`}>
              {ar ? quizQuestions[currentStep].question_ar : quizQuestions[currentStep].question_en}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizQuestions[currentStep].options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleAnswer(option.category)}
                  className={`p-6 border border-border/50 bg-background hover:border-primary hover:bg-primary/5 transition-all duration-300 rounded-xl text-lg ${ar ? "font-['Tajawal']" : ""}`}
                >
                  {ar ? option.text_ar : option.text_en}
                </button>
              ))}
            </div>

            <div className="mt-12 flex justify-center gap-2">
              {quizQuestions.map((_, idx) => (
                <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? "w-8 bg-primary" : "w-2 bg-primary/20"}`} />
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-fade-up bg-background p-10 rounded-2xl border border-border/50 shadow-sm">
            <h2 className={`text-3xl font-bold text-foreground mb-6 ${ar ? "font-['Tajawal']" : "font-serif"}`}>
              {ar ? "عطرك المثالي هو" : "Your Perfect Match Is"}
            </h2>
            
            {isLoading ? (
              <p className="text-muted-foreground">{ar ? "جاري البحث..." : "Finding your match..."}</p>
            ) : recommendedProduct ? (
              <div className="flex flex-col items-center">
                <img src={recommendedProduct.images?.[0] || '/perfume.png'} alt="Perfume" className="w-48 h-64 object-cover rounded-lg mb-6 shadow-md" />
                <h3 className="text-2xl font-bold mb-2 text-foreground">
                  {ar ? recommendedProduct.title_ar : recommendedProduct.title_en}
                </h3>
                <p className="text-muted-foreground mb-8 text-sm max-w-sm">
                  {ar ? recommendedProduct.description_ar : recommendedProduct.description_en}
                </p>
                <div className="flex gap-4">
                  <Button onClick={() => navigate({ to: "/product/$id", params: { id: recommendedProduct.id } })} className="bg-primary text-white hover:bg-primary/90 px-8 py-6 text-lg">
                    {ar ? "عرض المنتج" : "View Product"}
                  </Button>
                  <Button variant="outline" onClick={resetQuiz} className="px-8 py-6 text-lg">
                    {ar ? "إعادة الاختبار" : "Retake Quiz"}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground mb-6">{ar ? "عذراً، لم نتمكن من العثور على منتج مناسب حالياً." : "Sorry, we couldn't find a matching product right now."}</p>
                <Button variant="outline" onClick={resetQuiz} className="px-8 py-6 text-lg">
                  {ar ? "إعادة الاختبار" : "Retake Quiz"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

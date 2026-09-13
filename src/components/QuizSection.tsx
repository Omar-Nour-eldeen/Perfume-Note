import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/lib/cart-store";
import { Button } from "./ui/button";
import { Sparkles, ShoppingBag, ArrowRight, RotateCcw, Check, Star, Award } from "lucide-react";
import { toast } from "sonner";

type ProfileType = "stronger" | "bleu" | "sauvage" | "khamrah";

interface QuizOption {
  id: string;
  text_ar: string;
  text_en: string;
  desc_ar?: string;
  desc_en?: string;
  profile: ProfileType;
}

interface QuizQuestion {
  id: number;
  question_ar: string;
  question_en: string;
  subtitle_ar: string;
  subtitle_en: string;
  options: QuizOption[];
}

const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    question_ar: "ما هي الأجواء والبيئة الأحب إلى قلبك عند اختيار العطر؟",
    question_en: "What atmosphere or mood do you resonate with most?",
    subtitle_ar: "اختر الأجواء التي تشعر أنها تمثل ذوقك الخاص",
    subtitle_en: "Select the setting that best reflects your preference",
    options: [
      {
        id: "mood_cozy_warm",
        text_ar: "أجواء دافئة وهادئة (جلسة مريحة في ليلة شتوية دافئة)",
        text_en: "Cozy & Warm Atmosphere (Relaxing in a warm winter night)",
        desc_ar: "عبق دافئ يبعث على الراحة والجاذبية مع لمسات سكرية وأخشاب",
        desc_en: "Enveloping warmth with sweet gourmand and smooth woody notes",
        profile: "stronger",
      },
      {
        id: "mood_fresh_breeze",
        text_ar: "انتعاش وحيوية (نسيم الصباح أو أجواء صيفية مشمسة)",
        text_en: "Vibrant & Crisp Freshness (Morning breeze or sunny outdoors)",
        desc_ar: "نفحات حمضية ومائية صافية تمنحك إحساساً بالنظافة والتجدد",
        desc_en: "Zesty citrus and clean aquatic notes for active energy",
        profile: "bleu",
      },
      {
        id: "mood_bold_presence",
        text_ar: "أناقة جادة وحضور قوي يفرض نفسه بثقة",
        text_en: "Bold & Commanding Presence (Strong, confident impact)",
        desc_ar: "لمسات فلفلية وخشبية حادة تترك انطباعاً واثقاً وغير عادي",
        desc_en: "Sharp pepper, cedarwood and ambroxan sillage for confidence",
        profile: "sauvage",
      },
      {
        id: "mood_oriental_gala",
        text_ar: "فخامة عربية معتقة وعبق شرقي يملأ المكان",
        text_en: "Rich Arabian Elegance & Smoky Oriental Notes",
        desc_ar: "روائح التمر والقرفة والعنبر البخوري الثقيل للمناسبات الفخمة",
        desc_en: "Opulent amber, spiced cinnamon and sweet gourmand accords",
        profile: "khamrah",
      },
    ],
  },
  {
    id: 2,
    question_ar: "ما هو الانطباع الذي تحب أن يتركه عطرك لدى من حولك؟",
    question_en: "What impression do you want your fragrance to leave?",
    subtitle_ar: "العطر هو الرسالة الصامتة التي تعبر عن حضورك",
    subtitle_en: "Your perfume is the silent message that introduces you",
    options: [
      {
        id: "impression_magnetic",
        text_ar: "جاذبية ساحرة ودفء يلفت الانتباه برقي عند الاقتراب منك",
        text_en: "Magnetic Allure & Captivating Warmth when close",
        desc_ar: "تركيبة مغرية تجمع بين حلاوة الكستناء والهيل والفانيليا الدافئة",
        desc_en: "Addictive warmth with sugared chestnut, cardamom and vanilla",
        profile: "stronger",
      },
      {
        id: "impression_refined",
        text_ar: "انطباع راقٍ، نظيف، وأريستوقراطي يناسب كل الأوقات",
        text_en: "Refined, Clean & Sophisticated All-Day Class",
        desc_ar: "مزيج متناغم من الجريب فروت والنعناع وأخشاب الصندل الفاخرة",
        desc_en: "Balanced blend of grapefruit, mint and precious sandalwood",
        profile: "bleu",
      },
      {
        id: "impression_sharp",
        text_ar: "حضور حاد، قوي، ويفرض هيبتك بمجرد دخولك المكان",
        text_en: "Sharp, Powerful & Unforgettable Impact",
        desc_ar: "فوحان خشبي فلفلي نفاذ يقاوم درجات الحرارة والتحركات",
        desc_en: "High projection zesty pepper and wild ambroxan trail",
        profile: "sauvage",
      },
      {
        id: "impression_gourmand_rich",
        text_ar: "عبق شرقي سكري دافئ يلتصق بالذاكرة والملابس",
        text_en: "Deep Sweet Oriental Memory that lingers for days",
        desc_ar: "ثبات عالي جداً مع نوتات التمر والقرفة والعنبر الدافئ",
        desc_en: "Unbeatable oriental sillage with dates, cinnamon and amber",
        profile: "khamrah",
      },
    ],
  },
  {
    id: 3,
    question_ar: "كيف تحب أن تكون النوتة العطرية البارزة في عطرك؟",
    question_en: "Which fragrance profile speaks to your senses?",
    subtitle_ar: "اختر المكون العطري الذي ترتاح إليه حواسك",
    subtitle_en: "Choose the key note that brings you comfort",
    options: [
      {
        id: "note_chestnut_vanilla",
        text_ar: "دفء الفانيليا مع لمسة أخشاب وكستناء محلاة وهيل",
        text_en: "Warm Vanilla with Sugared Chestnut & Cardamom",
        desc_ar: "عبق دافئ وسكري متناغم يمنحك شعوراً بالفخامة والراحة",
        desc_en: "Warm, sweet, spicy and addictive gourmand blend",
        profile: "stronger",
      },
      {
        id: "note_citrus_mint",
        text_ar: "انتعاش الحمضيات مع نفحة نعناع وأعشاب برية",
        text_en: "Crisp Citrus with Cooling Mint & Green Accords",
        desc_ar: "إحساس بالنظافة والانتعاش الصافي كنسيم البحر",
        desc_en: "Refreshing citrus oils and cool herbal breeze",
        profile: "bleu",
      },
      {
        id: "note_pepper_woods",
        text_ar: "نكهة الفلفل الجريء مع برغموت وأخشاب الأرز الحادة",
        text_en: "Spicy Pepper, Zesty Bergamot & Cedarwood",
        desc_ar: "طابع حاد وفلفلي يترك أثراً واضحاً في الهواء",
        desc_en: "Bold spicy pepper backed by sharp woods and citrus",
        profile: "sauvage",
      },
      {
        id: "note_cinnamon_amber",
        text_ar: "عبق القرفة والتمور والعنبر الشرقية المسبوكة",
        text_en: "Rich Cinnamon, Sweet Dates & Golden Amber",
        desc_ar: "تركيبة شرقية دافئة غنية بمشروب التوابل الفاخرة",
        desc_en: "Deep spiced sweetness with dates and praline",
        profile: "khamrah",
      },
    ],
  },
  {
    id: 4,
    question_ar: "أين ترى نفسك تضع هذا العطر بشكل أساسي؟",
    question_en: "Where do you envision yourself wearing this perfume?",
    subtitle_ar: "اختيار المكان المناسب يساعد في تحديد العطر الأجمل",
    subtitle_en: "Selecting the location helps us recommend the best scent",
    options: [
      {
        id: "occ_romantic_evenings",
        text_ar: "في السهرات، المواعيد الخاصة، والليالي الدافئة",
        text_en: "Special Evenings, Dates & Warm Intimate Nights",
        desc_ar: "عطر جذّاب وقريب من القلب يترك أثراً حميمياً ودافئاً",
        desc_en: "Intimate and captivating warmth built for dates and evenings",
        profile: "stronger",
      },
      {
        id: "occ_daily_office",
        text_ar: "في بيئة العمل، الاجتماعات، واللقاءات النهارية",
        text_en: "Work Environment, Meetings & Daily Office Wear",
        desc_ar: "عطر متوازن وراقٍ يمنحك ثقة ونظافة طوال ساعات الدوام",
        desc_en: "Professional, clean and elegant for office hours",
        profile: "bleu",
      },
      {
        id: "occ_casual_outings",
        text_ar: "في الخروج اليومي، الأنشطة، والتحركات النهارية",
        text_en: "Daily Casual Outings, Sports & Outdoor Leisure",
        desc_ar: "عطر حاد، منعش، وفواح يقاوم الحركة وارتفاع الحرارة",
        desc_en: "Vibrant and crisp projection built for active outdoors",
        profile: "sauvage",
      },
      {
        id: "occ_festive_royal",
        text_ar: "في الاحتفالات الفخمة، المناسبات، والأعراس الشرقية",
        text_en: "Grand Celebrations, Weddings & Festive Occasions",
        desc_ar: "عطر بخوري فخم وثقيل يلفت الأنظار ويملأ المكان",
        desc_en: "Rich oriental sillage designed for grand festive nights",
        profile: "khamrah",
      },
    ],
  },
  {
    id: 5,
    question_ar: "ما هي طبيعة فوحان وثبات العطر التي تبحث عنها؟",
    question_en: "What level of scent projection and trail do you prefer?",
    subtitle_ar: "حدد مدى انتشار رائحة عطرك في المكان",
    subtitle_en: "Choose the intensity of your fragrance trail",
    options: [
      {
        id: "trail_warm_magnetic",
        text_ar: "فوحان دافئ جذاب يلتف حولك بهالة مغناطيسية ساحرة",
        text_en: "Enveloping Warm Sillage with Captivating Magnetic Trail",
        desc_ar: "ينتشر ببطء ودفء ليجذب كل من يقترب منك برقي",
        desc_en: "Inviting personal bubble of rich vanilla, chestnut and cardamom",
        profile: "stronger",
      },
      {
        id: "trail_smooth_balanced",
        text_ar: "عبق متوازن، راقٍ، ومريح للنفس يرافقك طوال اليوم",
        text_en: "Smooth & Balanced Projection for all-day comfort",
        desc_ar: "توازن فرنسي مثالي بين الحمضيات والنعناع والأخشاب",
        desc_en: "Sophisticated balance of grapefruit, mint and sandalwood",
        profile: "bleu",
      },
      {
        id: "trail_sharp_high",
        text_ar: "فوحان حاد ومنعش يفرض حضوره فور دخولك المكان",
        text_en: "Sharp High Projection filling the space instantly",
        desc_ar: "انتعاش قوي وفلفلي يترك أثراً واضحاً دون تردد",
        desc_en: "High impact sillage of fresh bergamot and wild pepper",
        profile: "sauvage",
      },
      {
        id: "trail_oriental_extreme",
        text_ar: "ثبات شرقي معتق يلتصق بالأقمشة والذاكرة لأيام",
        text_en: "Ultra Long-lasting Oriental Persistence on fabrics",
        desc_ar: "تركيز غني جداً بالزيوت الشرقية والتوابل الدافئة",
        desc_en: "Deep spiced longevity with dates, cinnamon and amber",
        profile: "khamrah",
      },
    ],
  },
];

interface ScoredProduct {
  product: any;
  score: number;
  matchPercentage: number;
}

export function QuizSection() {
  const { language } = useI18n();
  const ar = language === "ar";
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const isCartLoading = useCartStore((s) => s.isLoading);

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProfiles, setSelectedProfiles] = useState<ProfileType[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Fetch all active products and calculate real recommendation scores based on user selections
  const { data: scoredProducts, isLoading } = useQuery<ScoredProduct[]>({
    queryKey: ["quizRecommendations", selectedProfiles, showResult],
    queryFn: async () => {
      if (!showResult || selectedProfiles.length === 0) return [];

      const { data: products, error } = await supabase
        .from("products")
        .select("*, categories(name_ar, name_en, slug)")
        .eq("is_active", true);

      if (error || !products || products.length === 0) {
        console.error("Error fetching products for quiz:", error);
        return [];
      }

      // Count votes per profile
      const profileVotes: Record<ProfileType, number> = {
        stronger: 0,
        bleu: 0,
        sauvage: 0,
        khamrah: 0,
      };

      selectedProfiles.forEach((p) => {
        if (profileVotes[p] !== undefined) {
          profileVotes[p] += 1;
        }
      });

      // Match products to profiles
      const scored: ScoredProduct[] = products.map((prod) => {
        const titleAr = (prod.title_ar || "").toLowerCase();
        const titleEn = (prod.title_en || "").toLowerCase();
        const descAr = (prod.description_ar || "").toLowerCase();
        const descEn = (prod.description_en || "").toLowerCase();
        const topNotes = (prod.top_notes_ar || "").toLowerCase();
        const heartNotes = (prod.heart_notes_ar || "").toLowerCase();
        const baseNotes = (prod.base_notes_ar || "").toLowerCase();
        const fullText = `${titleAr} ${titleEn} ${descAr} ${descEn} ${topNotes} ${heartNotes} ${baseNotes}`;

        let prodProfile: ProfileType = "sauvage";

        if (/stronger|سترونجر|كستناء|chestnut|cardamom|هيل|فانيليا|أنكلي/i.test(fullText)) {
          prodProfile = "stronger";
        } else if (/khamrah|خمرة|تمر|dates|cinnamon|قرفة|برالين|praline|لطافة/i.test(fullText)) {
          prodProfile = "khamrah";
        } else if (/bleu|شانيل|بلو|نعناع|جريب فروت|grapefruit|صندل/i.test(fullText)) {
          prodProfile = "bleu";
        } else if (/sauvage|سوفاج|أمبروكسان|ambroxan|سيتشوان/i.test(fullText)) {
          prodProfile = "sauvage";
        }

        const score = profileVotes[prodProfile] || 0;

        let matchPercentage = 70;
        if (score === 5) matchPercentage = 98;
        else if (score === 4) matchPercentage = 94;
        else if (score === 3) matchPercentage = 89;
        else if (score === 2) matchPercentage = 83;
        else if (score === 1) matchPercentage = 77;

        return {
          product: prod,
          score,
          matchPercentage,
        };
      });

      // Sort by score descending
      return scored.sort((a, b) => b.score - a.score);
    },
    enabled: showResult,
  });

  const handleSelectOption = (option: QuizOption) => {
    setSelectedProfiles((prev) => [...prev, option.profile]);

    if (currentStep < quizQuestions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleAddToCart = async (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setAddingId(product.id);
      await addItem(product, 1);
      toast.success(
        ar ? `تمت إضافة "${product.title_ar}" إلى السلة` : `Added "${product.title_en}" to cart`
      );
    } catch (err) {
      toast.error(ar ? "حدث خطأ أثناء الإضافة" : "Failed to add to cart");
    } finally {
      setAddingId(null);
    }
  };

  const resetQuiz = () => {
    setCurrentStep(0);
    setSelectedProfiles([]);
    setShowResult(false);
  };

  const topMatch = scoredProducts && scoredProducts.length > 0 ? scoredProducts[0] : null;
  const runnerUps = scoredProducts && scoredProducts.length > 1 ? scoredProducts.slice(1, 3) : [];
  const activeQuestion = quizQuestions[currentStep] || quizQuestions[0];

  return (
    <section id="quiz" className="py-16 md:py-24 bg-secondary/30 relative overflow-hidden">
      <div className="max-w-screen-md mx-auto px-4 md:px-8 relative z-10">

        {!showResult ? (
          <div className="animate-fade-up">
            {/* Header progress info */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold tracking-widest uppercase text-primary flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                {ar ? `السؤال ${currentStep + 1} من ${quizQuestions.length}` : `Question ${currentStep + 1} of ${quizQuestions.length}`}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {Math.round(((currentStep + 1) / quizQuestions.length) * 100)}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-primary/10 h-2 rounded-full overflow-hidden mb-10">
              <div
                className="bg-primary h-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStep + 1) / quizQuestions.length) * 100}%` }}
              />
            </div>

            {/* Question Title & Subtitle */}
            <div className="text-center mb-10">
              <h2 className={`text-2xl md:text-4xl font-bold text-foreground mb-3 ${ar ? "font-['Tajawal']" : "font-serif"}`}>
                {ar ? activeQuestion.question_ar : activeQuestion.question_en}
              </h2>
              <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto">
                {ar ? activeQuestion.subtitle_ar : activeQuestion.subtitle_en}
              </p>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 gap-4">
              {activeQuestion.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option)}
                  className="group relative text-right p-5 md:p-6 border border-border/60 bg-background hover:border-primary hover:bg-primary/5 transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3 w-full">
                    <div>
                      <h3 className={`text-base md:text-lg font-bold text-foreground group-hover:text-primary transition-colors ${ar ? "font-['Tajawal']" : ""}`}>
                        {ar ? option.text_ar : option.text_en}
                      </h3>
                      {(option.desc_ar || option.desc_en) && (
                        <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-relaxed">
                          {ar ? option.desc_ar : option.desc_en}
                        </p>
                      )}
                    </div>
                    <div className="w-7 h-7 rounded-full border border-border/80 group-hover:border-primary group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all shrink-0 mt-1">
                      <ArrowRight className={`w-4 h-4 ${ar ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Step Indicators */}
            <div className="mt-10 flex justify-center gap-2">
              {quizQuestions.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep ? "w-8 bg-primary" : idx < currentStep ? "w-3 bg-primary/60" : "w-2 bg-primary/20"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          /* RESULT SCREEN */
          <div className="animate-fade-up">
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
                <Award className="w-4 h-4" />
                {ar ? "نتيجة التحليل العطري" : "Olfactory Analysis Result"}
              </span>
              <h2 className={`text-3xl md:text-4xl font-bold text-foreground ${ar ? "font-['Tajawal']" : "font-serif"}`}>
                {ar ? "العطر الأكثر ملاءمة لشخصيتك" : "Your Recommended Signature Fragrance"}
              </h2>
            </div>

            {isLoading ? (
              <div className="bg-background p-12 rounded-3xl border border-border/60 text-center shadow-sm">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">
                  {ar ? "جاري تحليل تفضيلاتك العطرية والبحث عن التطابق المثالي..." : "Analyzing your olfactory profile to find your best match..."}
                </p>
              </div>
            ) : topMatch ? (
              <div className="space-y-8">
                {/* TOP MATCH CARD */}
                <div className="bg-background rounded-3xl border border-primary/30 p-6 md:p-8 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-primary via-amber-400 to-primary" />
                  
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Product Image */}
                    <div className="relative shrink-0 group cursor-pointer w-48 h-60 md:w-56 md:h-72 rounded-2xl overflow-hidden shadow-md border border-border/40 bg-gradient-to-b from-secondary/10 to-secondary/30 flex items-center justify-center" onClick={() => navigate({ to: "/product/$id", params: { id: topMatch.product.id } })}>
                      <img
                        src={topMatch.product.images?.[0] || "/perfume.png"}
                        alt={topMatch.product.title_ar}
                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-3 right-3 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center gap-1 z-10">
                        <Sparkles className="w-3 h-3" />
                        {topMatch.matchPercentage}% {ar ? "تطابق" : "Match"}
                      </span>
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 text-center md:text-right space-y-4">
                      <div>
                        {topMatch.product.categories && (
                          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                            {ar ? topMatch.product.categories.name_ar : topMatch.product.categories.name_en}
                          </span>
                        )}
                        <h3
                          onClick={() => navigate({ to: "/product/$id", params: { id: topMatch.product.id } })}
                          className="text-2xl md:text-3xl font-bold text-foreground hover:text-primary cursor-pointer transition-colors mt-1"
                        >
                          {ar ? topMatch.product.title_ar : topMatch.product.title_en}
                        </h3>
                      </div>

                      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                        {ar ? topMatch.product.description_ar : topMatch.product.description_en}
                      </p>

                      <div className="flex items-center justify-center md:justify-start gap-3">
                        <span className="text-2xl font-extrabold text-primary">
                          {topMatch.product.price} {ar ? "ج.م" : "EGP"}
                        </span>
                        {topMatch.product.original_price && topMatch.product.original_price > topMatch.product.price && (
                          <span className="text-sm text-muted-foreground line-through">
                            {topMatch.product.original_price} {ar ? "ج.م" : "EGP"}
                          </span>
                        )}
                      </div>

                      <div className="pt-3 flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <Button
                          onClick={(e) => handleAddToCart(topMatch.product, e)}
                          disabled={isCartLoading || addingId === topMatch.product.id}
                          className="bg-primary text-white hover:bg-primary/90 px-6 py-5 rounded-xl text-base font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                        >
                          <ShoppingBag className="w-5 h-5" />
                          {ar ? "إضافة إلى السلة" : "Add to Cart"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => navigate({ to: "/product/$id", params: { id: topMatch.product.id } })}
                          className="px-6 py-5 rounded-xl text-base border-border/80 hover:border-primary"
                        >
                          {ar ? "عرض التفاصيل" : "View Details"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RUNNER UPS (ALTERNATIVE MATCHES) */}
                {runnerUps.length > 0 && (
                  <div className="pt-4">
                    <h4 className={`text-xl font-bold text-foreground mb-4 text-center md:text-right ${ar ? "font-['Tajawal']" : ""}`}>
                      {ar ? "خيارات أخرى قد تنال إعجابك بناءً على إجاباتك:" : "Other scents you might also love:"}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {runnerUps.map(({ product, matchPercentage }) => (
                        <div
                          key={product.id}
                          onClick={() => navigate({ to: "/product/$id", params: { id: product.id } })}
                          className="bg-background rounded-2xl border border-border/60 p-4 flex items-center gap-4 hover:border-primary transition-all cursor-pointer group shadow-sm"
                        >
                          <div className="w-20 h-24 rounded-xl shrink-0 bg-secondary/20 overflow-hidden border border-border/40 flex items-center justify-center p-1">
                            <img
                              src={product.images?.[0] || "/perfume.png"}
                              alt={product.title_ar}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {matchPercentage}% {ar ? "تطابق" : "Match"}
                              </span>
                            </div>
                            <h5 className="font-bold text-foreground truncate group-hover:text-primary transition-colors text-sm">
                              {ar ? product.title_ar : product.title_en}
                            </h5>
                            <p className="text-xs font-bold text-primary mt-1">
                              {product.price} {ar ? "ج.م" : "EGP"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* RESET BUTTON */}
                <div className="text-center pt-6">
                  <Button variant="ghost" onClick={resetQuiz} className="gap-2 text-muted-foreground hover:text-foreground">
                    <RotateCcw className="w-4 h-4" />
                    {ar ? "إعادة الاختبار واكتشاف عطر آخر" : "Retake Quiz & Explore Again"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-background p-10 rounded-2xl border border-border/60 text-center space-y-4">
                <p className="text-muted-foreground">
                  {ar ? "عذراً، لم نتمكن من العثور على عطر مطابق حالياً." : "Sorry, no matching perfume found right now."}
                </p>
                <Button variant="outline" onClick={resetQuiz} className="gap-2">
                  <RotateCcw className="w-4 h-4" />
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


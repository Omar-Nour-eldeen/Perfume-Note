import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useI18n } from "@/lib/i18n";
import { siteAssets } from "@/lib/site-assets";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const slides = [
  {
    id: 1,
    image: siteAssets.hero,
    imageMobile: siteAssets.heroMobile,
    eyebrow_en: "NEW COLLECTION",
    eyebrow_ar: "مجموعة جديدة",
    title_en: "Find Your\nSignature\nScent.",
    title_ar: "اكتشف\nعطرك\nالمميز.",
    desc_en: "Luxury fragrances crafted to reflect who you are.",
    desc_ar: "عطور فاخرة صُممت لتعبر عن شخصيتك الحقيقية.",
    cta_en: "Find Your Fragrance",
    cta_ar: "اكتشف عطرك المناسب",
  }
];

export function Hero() {
  const { language } = useI18n();
  const ar = language === "ar";

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, direction: "ltr", watchDrag: false }, // Enforce LTR for carousel direction, disable mouse drag
    [Autoplay({ delay: 6000, stopOnInteraction: false })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  return (
    <section className="relative w-full h-[65vh] md:h-[85vh] min-h-[450px] md:min-h-[500px] bg-[#f8f5f0]">
      {/* Carousel */}
      <div className="w-full h-full overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide) => (
            <div key={slide.id} className="relative flex-[0_0_100%] min-w-0 h-full">
              {/* Background Images */}
              <div className="absolute inset-0 bg-black">
                {/* Mobile + Tablet Image */}
                <div
                  className="absolute inset-0 lg:hidden bg-cover bg-no-repeat"
                  style={{ backgroundImage: `url('${slide.imageMobile}')` }}
                />
                {/* Desktop Image */}
                <div
                  className="hidden lg:block absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${slide.image}')` }}
                />
                {/* Gradient correctly aligned to the text side (start) to keep the hero image fully visible on the other side. Using black so white text is readable. */}
                <div className={`absolute inset-0 ${ar ? "bg-gradient-to-l" : "bg-gradient-to-r"} from-black/60 via-black/20 to-transparent`} />
              </div>

              {/* Text content */}
              <div className={`relative h-full flex flex-col justify-center max-w-screen-xl mx-auto px-8 md:px-16 items-start text-start`}>
                <div className="max-w-xl animate-fade-up mt-12">
                  <p className={`text-[13px] md:text-sm font-semibold text-white/90 mb-4 drop-shadow-md ${ar ? "font-['Tajawal']" : "uppercase tracking-widest"}`}>
                    {ar ? slide.eyebrow_ar : slide.eyebrow_en}
                  </p>
                  <h1 className={`text-5xl md:text-7xl lg:text-[80px] text-white mb-6 leading-[1.1] whitespace-pre-line drop-shadow-lg ${ar ? "font-['Tajawal'] font-bold" : "font-serif"}`}>
                    {ar ? slide.title_ar : slide.title_en}
                  </h1>
                  <p className={`text-sm md:text-lg text-white/90 mb-10 max-w-sm leading-relaxed drop-shadow-md ${ar ? "font-['Tajawal']" : ""}`}>
                    {ar ? slide.desc_ar : slide.desc_en}
                  </p>
                  <Link
                    to="/quiz"
                    className={`inline-block px-10 py-4 bg-white text-black text-xs font-bold hover:bg-black hover:text-white transition-all duration-300 ${ar ? "font-['Tajawal'] tracking-wide" : "tracking-[0.2em] uppercase"}`}
                  >
                    {ar ? slide.cta_ar : slide.cta_en}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}


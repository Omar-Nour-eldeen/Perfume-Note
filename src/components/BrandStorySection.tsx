import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import brandStoryImg from "@/assets/images/brand_story.jpg";

export function BrandStorySection() {
  const { language } = useI18n();
  const ar = language === "ar";
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section id="story" className="py-20 md:py-32 bg-secondary/40">
      <div className="max-w-screen-xl mx-auto px-6 md:px-10">
        <div className={`grid md:grid-cols-2 gap-12 md:gap-20 items-center`}>

          {/* Image */}
          <div
            className={`relative img-zoom overflow-hidden ${ar ? "md:order-2" : "md:order-1"}`}
            style={{ aspectRatio: "4/5" }}
          >
            <img
              src={brandStoryImg}
              alt="Perfume Note Brand Story"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Text */}
          <div className={`flex flex-col items-start text-start`}>
            <p className="text-xs font-medium tracking-[0.22em] uppercase text-primary mb-6">
              {ar ? "قصتنا" : "OUR STORY"}
            </p>
            <h2 className={`text-3xl md:text-5xl text-foreground mb-8 leading-tight ${ar ? "font-['Tajawal'] font-bold" : "font-serif"}`}>
              {ar ? "صُنعت لتصبح\nذكرى." : "CRAFTED TO\nBECOME A\nMEMORY."}
            </h2>
            <p className={`text-sm md:text-base text-muted-foreground leading-relaxed mb-6 max-w-md ${ar ? "font-['Tajawal']" : ""}`}>
              {ar
                ? "في بيرفيوم نوت، نؤمن بأن العطر هو التعبير الأعمق عن الهوية. كل قطرة تحكي قصة، وكل رائحة تترك أثراً في القلب والذاكرة."
                : "At Perfume Note, we believe fragrance is the deepest form of self-expression. Each drop tells a story. Each scent leaves a mark on the heart and in memory."}
            </p>
            <p className={`text-sm text-muted-foreground leading-relaxed max-w-md ${isExpanded ? "mb-4" : "mb-10"}`}>
              {ar
                ? "نختار عطورنا بعناية شديدة من أعرق دور العطور العالمية، لنقدم لك تجربة شمية لا مثيل لها."
                : "We carefully select our fragrances from the world's most prestigious perfume houses, offering you an olfactory experience unlike any other."}
            </p>

            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? "max-h-[500px] opacity-100 mb-10" : "max-h-0 opacity-0 m-0"}`}>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                {ar 
                  ? "تأسست علامتنا بشغف نحو التميز والإبداع في عالم العطور. نحن لا نقدم مجرد عطور، بل نقدم تجارب ساحرة تأسر الحواس وتأخذك في رحلة فريدة عبر الزمن والذكريات. نفخر بأن نكون جزءًا من لحظاتكم المميزة."
                  : "Our brand was founded with a passion for excellence and creativity in the world of fragrances. We don't just offer perfumes, we provide enchanting experiences that captivate the senses and take you on a unique journey through time and memories. We are proud to be part of your special moments."}
              </p>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-block text-xs font-semibold tracking-[0.18em] uppercase text-foreground border-b border-foreground pb-0.5 hover:text-primary hover:border-primary transition-colors duration-200"
            >
              {ar 
                ? (isExpanded ? "عرض أقل" : "تعرف أكثر") 
                : (isExpanded ? "SHOW LESS" : "READ MORE")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}


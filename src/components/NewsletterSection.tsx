import { useI18n } from "@/lib/i18n";

export function NewsletterSection() {
  const { language } = useI18n();
  const ar = language === "ar";

  return (
    <section className="py-20 md:py-28 bg-foreground text-background">
      <div className="max-w-screen-xl mx-auto px-6 md:px-10 flex flex-col items-center text-center">
        <p className="text-xs font-medium tracking-[0.22em] uppercase text-background/50 mb-5">
          {ar ? "مجتمعنا" : "OUR COMMUNITY"}
        </p>
        <h2 className="text-3xl md:text-5xl font-serif text-background mb-5 max-w-xl leading-tight">
          {ar ? "انضم لمجتمعنا\nعلى واتساب." : "JOIN OUR WHATSAPP\nCOMMUNITY."}
        </h2>
        <p className="text-sm text-background/60 max-w-sm mb-10 leading-relaxed">
          {ar
            ? "اكتشف عطوراً جديدة، عروضاً حصرية وكن أول من يعلم عن إصداراتنا مباشرة على هاتفك."
            : "Discover new fragrances, exclusive offers and be the first to know about our releases directly on your phone."}
        </p>

        <a
          href="https://whatsapp.com/channel/0029VbCdmimBqbrBcBRMG938"
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-4 bg-[#25D366] text-white text-sm font-bold tracking-wide rounded-full hover:bg-[#1DA851] transition-colors duration-200 shadow-lg flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
          </svg>
          {ar ? "اشترك عبر واتساب" : "JOIN ON WHATSAPP"}
        </a>
      </div>
    </section>
  );
}

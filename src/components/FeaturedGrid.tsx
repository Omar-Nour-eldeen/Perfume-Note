import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { Tag } from "lucide-react";
import type { Product } from "@/lib/types";

interface FeaturedGridProps {
  products: Product[];
  isOffers?: boolean;
}

export function FeaturedGrid({ products, isOffers = false }: FeaturedGridProps) {
  const { language } = useI18n();
  const ar = language === "ar";

  const discountPct = (p: Product) =>
    p.original_price && p.original_price > p.price
      ? Math.round((1 - p.price / p.original_price) * 100)
      : null;

  return (
    <section id="collection" className="py-16 md:py-24 bg-background">
      <div className="max-w-screen-xl mx-auto px-6 md:px-10">
        {/* Section header */}
        <div className={`mb-10 flex flex-col items-start text-start`}>
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-2 flex items-center gap-2">
            {isOffers && <Tag className="w-3.5 h-3.5" />}
            {isOffers ? (ar ? "لفترة محدودة" : "LIMITED TIME") : (ar ? "تشكيلتنا" : "OUR COLLECTION")}
          </p>
          <h2 className={`text-3xl md:text-4xl text-foreground ${ar ? "font-['Tajawal'] font-bold" : "font-serif"}`}>
            {isOffers ? (ar ? "عروض حصرية 🔥" : "Exclusive Offers 🔥") : (ar ? "تشكيلة مختارة" : "Featured Selection")}
          </h2>
          <div className="mt-3 w-10 h-0.5 bg-primary" />
        </div>

        {/* 2x2 Grid (1 column on mobile, 2 on md) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {products.map((product) => (
            <Link
              key={product.id}
              to="/product/$id"
              params={{ id: product.id }}
              className={`group relative overflow-hidden bg-secondary rounded-[20px] border-2 ${isOffers ? "border-red-600" : "border-transparent"}`}
              style={{ aspectRatio: "4/3" }}
            >
              {/* Background Image */}
              {product.images?.[0] ? (
                <img
                  src={product.images[0]}
                  alt={ar ? product.title_ar : product.title_en}
                  className="w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-[1.03]"
                />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
              
              {/* Gradient Overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Top Badge */}
              <div className="absolute top-5 start-5">
                {product.badge_ar || product.badge_en ? (
                  <span className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[11px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full shadow-lg">
                    {ar ? product.badge_ar : product.badge_en}
                  </span>
                ) : isOffers && discountPct(product) ? (
                  <span className="inline-flex items-center gap-1.5 bg-red-600 text-white text-[11px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full shadow-lg">
                    -{discountPct(product)}% {ar ? "خصم" : "OFF"}
                  </span>
                ) : isOffers ? (
                  <span className="inline-block bg-red-600 text-white text-[10px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full">
                    {ar ? "عرض" : "OFFER"}
                  </span>
                ) : null}
              </div>

              {/* Bottom Info */}
              <div className={`absolute bottom-0 start-0 end-0 text-start p-6`}>
                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/70 mb-1.5 drop-shadow-md">
                  {isOffers ? (ar ? "عرض حصري" : "EXCLUSIVE OFFER") : (ar ? "جديدنا" : "NEW ARRIVAL")}
                </p>
                <h3 className={`text-2xl md:text-3xl font-bold text-white leading-tight drop-shadow-md ${ar ? "font-['Tajawal']" : "font-serif"}`}>
                  {ar ? product.title_ar : product.title_en}
                </h3>
                {product.unit && (
                  <p className="text-xs font-semibold text-white/75 mt-1">{product.unit}</p>
                )}

                {/* Pricing or Description */}
                {isOffers && product.original_price && product.original_price > product.price ? (
                  <div className="mt-3">
                    {/* Old price */}
                    <span className="text-white/50 text-sm line-through drop-shadow-md">
                      {product.original_price.toFixed(0)} {ar ? "ج.م" : "EGP"}
                    </span>

                    {/* New price — big & glowing */}
                    <div className="flex items-end gap-2 mt-0.5">
                      <span
                        className="text-4xl md:text-5xl font-black leading-none drop-shadow-lg"
                        style={{ color: "#FFD700", textShadow: "0 0 20px rgba(255,215,0,0.5), 0 2px 8px rgba(0,0,0,0.6)" }}
                      >
                        {product.price.toFixed(0)}
                      </span>
                      <span className="text-base font-bold text-yellow-300/80 mb-1">
                        {ar ? "ج.م" : "EGP"}
                      </span>
                    </div>

                    {/* Savings label */}
                    {(() => {
                      const saved = (product.original_price - product.price).toFixed(0);
                      return (
                        <p className={`text-green-400 text-xs font-bold mt-1.5 drop-shadow-md ${ar ? "font-['Tajawal']" : ""}`}>
                          {ar ? `وفّر ${saved} ج.م 🎉` : `Save ${saved} EGP 🎉`}
                        </p>
                      );
                    })()}

                    {/* CTA */}
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 text-white text-[11px] font-bold tracking-widest uppercase px-4 py-2 rounded-full group-hover:bg-white/25 transition-colors duration-300">
                      {ar ? "اشتري الآن ←" : "Shop Now →"}
                    </div>
                  </div>
                ) : (
                  (ar ? product.description_ar : product.description_en) && (
                    <p className={`text-sm text-white/70 line-clamp-1 drop-shadow-md mt-1 ${ar ? "font-['Tajawal']" : ""}`}>
                      {ar ? product.description_ar : product.description_en}
                    </p>
                  )
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

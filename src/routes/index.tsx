import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { Product } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { getCachedProducts } from "@/lib/data-cache";

import { StoreLayout } from "@/components/StoreLayout";
import { Hero } from "@/components/Hero";
import { Benefits } from "@/components/Benefits";
import { LuxuryProductCard } from "@/components/LuxuryProductCard";
import { FeaturedGrid } from "@/components/FeaturedGrid";
import { siteAssets } from "@/lib/site-assets";

export const Route = createFileRoute("/")({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData({
      queryKey: ["products"],
      queryFn: getCachedProducts,
    });
  },
  head: () => ({
    meta: [
      { title: "Perfume Note - بيرفيوم نوت" },
      { name: "description", content: "Discover luxury fragrances crafted to reflect who you are. Find your signature scent at Perfume Note." },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

function HomePage() {
  const { language } = useI18n();
  const ar = language === "ar";

  const { data: products } = useSuspenseQuery<Product[]>({
    queryKey: ["products"],
    queryFn: getCachedProducts,
    // Always consider products stale so admin changes show immediately.
    staleTime: 0,
  });

  // Each homepage section is controlled only by its matching admin checkbox.
  const featured = products.filter((product) => product.is_featured).slice(0, 4);
  const offerProducts = products.filter((product) => product.is_offer).slice(0, 4);

  return (
    <StoreLayout transparentNav>
      <Hero />
      <Benefits />

      {/* Featured Products grid */}
      {featured.length > 0 && (
        <section id="featured-products" className="py-14 md:py-20 bg-background">
          <div className="max-w-screen-xl mx-auto px-6 md:px-10">
            <div className="flex items-end justify-between mb-8">
              <div className="flex flex-col items-start text-start">
                <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-2">
                  {ar ? "اختيارات مميزة" : "CURATED FOR YOU"}
                </p>
                <h2 className={`text-2xl md:text-3xl text-foreground ${ar ? "font-['Tajawal'] font-bold" : "font-serif"}`}>
                  {ar ? "منتجات مميزة" : "Featured Products"}
                </h2>
              </div>
              <Link
                to="/shop"
                className="text-xs font-semibold tracking-[0.15em] uppercase text-foreground/50 border-b border-foreground/25 pb-0.5 hover:text-primary hover:border-primary transition-colors whitespace-nowrap"
              >
                {ar ? "عرض الكل ←" : "VIEW ALL →"}
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {featured.map((product) => (
                <LuxuryProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FeaturedGrid — shows OFFERS if available, else featured collection */}
      {offerProducts.length > 0 && (
        <FeaturedGrid products={offerProducts} isOffers />
      )}

      {/* Parallax CTA */}
      <section className="relative w-full aspect-video lg:aspect-auto lg:py-40 lg:min-h-[700px] flex items-center justify-center overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            aria-hidden="true"
          >
            <source src={siteAssets.heroVideo} type="video/mp4" />
          </video>
        </div>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 max-w-screen-xl mx-auto px-6 md:px-10 flex flex-col items-center text-center">
          <h2 className={`text-3xl md:text-5xl text-white mb-8 leading-tight max-w-2xl ${ar ? "font-['Tajawal'] font-bold" : "font-serif"}`}>
            {ar ? "عطرك القادم\nينتظرك هنا." : "Your Next\nSignature Scent\nAwaits."}
          </h2>
          <Link
            to="/shop"
            className="inline-block px-10 py-4 bg-white text-foreground text-xs font-semibold tracking-[0.18em] uppercase hover:bg-primary hover:text-white transition-colors duration-300"
          >
            {ar ? "تسوق الآن" : "SHOP NOW"}
          </Link>
        </div>
      </section>
    </StoreLayout>
  );
}

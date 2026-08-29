import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

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
      queryFn: async () => {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data as Product[];
      },
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
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
      <section
        className="relative py-20 md:py-32 overflow-hidden h-150 justify-content-center items-center flex"
        style={{ backgroundImage: `url('${siteAssets.hero}')`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}
      >
        <div className="absolute inset-0 bg-black/35" />
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

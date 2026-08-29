import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Product, Category } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { StoreLayout } from "@/components/StoreLayout";
import { LuxuryProductCard } from "@/components/LuxuryProductCard";
import { PageHero } from "@/components/PageHero";
import { Search } from "lucide-react";
import heroShop from "@/assets/images/hero_shop.jpg";

export const Route = createFileRoute("/shop")({
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
    await queryClient.ensureQueryData({
      queryKey: ["categories"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("created_at", { ascending: true });
        if (error) throw error;
        return data as Category[];
      },
    });
  },
  head: () => ({
    meta: [
      { title: "المتجر — PERFUME NOTE" },
      { name: "description", content: "تصفح جميع عطورنا الفاخرة واختر عطرك المثالي" },
    ],
  }),
  component: ShopPage,
});

type SortOption = "newest" | "price_asc" | "price_desc";

function ShopPage() {
  const { language } = useI18n();
  const ar = language === "ar";
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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

  const { data: categories } = useSuspenseQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });

  const filtered = products
    .filter((p) => {
      if (selectedCategory !== "all" && p.category_id !== selectedCategory) {
        return false;
      }
      const q = search.toLowerCase();
      return (
        (p.title_ar ?? "").includes(q) ||
        (p.title_en ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <StoreLayout>

      <PageHero
        eyebrow={ar ? "كل المنتجات" : "ALL PRODUCTS"}
        title={ar ? "المتجر" : "The Shop"}
        subtitle={ar ? "اكتشف تشكيلتنا الكاملة من العطور الفاخرة" : "Discover our full collection of luxury fragrances"}
        image={heroShop}
      />

      {/* Filters bar */}
      <section className="sticky top-16 md:top-20 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40 py-3 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6 md:px-10 flex flex-col gap-4">
          
          {/* Categories Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-foreground hover:bg-secondary/70 border border-border/50"
              }`}
            >
              {ar ? "الكل" : "All"}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-secondary text-foreground hover:bg-secondary/70 border border-border/50"
                }`}
              >
                {ar ? cat.name_ar : cat.name_en}
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={ar ? "ابحث عن عطر..." : "Search fragrances..."}
                className="w-full bg-secondary/50 rounded-lg border border-border/40 text-sm text-foreground placeholder:text-muted-foreground pe-10 ps-4 py-2 outline-none focus:border-primary/60 transition-colors"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="bg-secondary/50 rounded-lg border border-border/40 text-xs text-foreground px-4 py-2.5 outline-none focus:border-primary/60 transition-colors cursor-pointer"
            >
              <option value="newest">{ar ? "الأحدث" : "Newest"}</option>
              <option value="price_asc">{ar ? "السعر: من الأقل" : "Price: Low to High"}</option>
              <option value="price_desc">{ar ? "السعر: من الأعلى" : "Price: High to Low"}</option>
            </select>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-14 md:py-20 min-h-[50vh]">
        <div className="max-w-screen-xl mx-auto px-6 md:px-10">
          {filtered.length === 0 ? (
            <div className="text-center py-24 bg-card rounded-3xl border border-border/40">
              <p className="text-muted-foreground text-sm">{ar ? "لا توجد نتائج مطابقة لبحثك" : "No results found matching your criteria"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {filtered.map((product) => (
                <LuxuryProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

    </StoreLayout>
  );
}



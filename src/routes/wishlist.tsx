import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { StoreLayout } from "@/components/StoreLayout";
import { LuxuryProductCard } from "@/components/LuxuryProductCard";
import { useI18n } from "@/lib/i18n";
import { useNavigate, Link } from "@tanstack/react-router";
import type { Product } from "@/lib/types";
import { Heart } from "lucide-react";
import { useWishlistStore } from "@/lib/wishlist-store";

export const Route = createFileRoute("/wishlist")({
  component: WishlistPage,
});

function WishlistPage() {
  const { language } = useI18n();
  const ar = language === "ar";
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);

  // Track wishlist store IDs — when an item is removed from the store, remove it from local list instantly
  const wishlistIds = useWishlistStore((s) => s.productIds);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth/login" });
    } else if (user) {
      fetchWishlist();
    }
  }, [user, loading]);

  // Remove product from local list as soon as it's removed from the store
  useEffect(() => {
    setProducts((prev) => prev.filter((p) => wishlistIds.includes(p.id)));
  }, [wishlistIds]);

  const fetchWishlist = async () => {
    if (!user) return;
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("wishlists")
        .select(`
          product_id,
          products (*)
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      const mapped = (data || [])
        .map((item: any) => item.products)
        .filter(Boolean) as Product[];

      setProducts(mapped);
      // Sync local store to fix the Navbar badge count if items were deleted remotely
      useWishlistStore.getState().setWishlist(mapped.map(p => p.id));
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-muted-foreground">{ar ? "جاري التحميل..." : "Loading wishlist..."}</span>
      </div>
    );
  }

  return (
    <StoreLayout>
      <main className="mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-1">
            <Heart className="w-5 h-5 text-primary fill-primary" />
            <h1 className="text-2xl font-black text-foreground">
              {ar ? "قائمة المفضلة" : "My Wishlist"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {ar
              ? `${products.length} ${products.length === 1 ? "منتج محفوظ" : "منتجات محفوظة"}`
              : `${products.length} saved ${products.length === 1 ? "item" : "items"}`}
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl bg-card flex flex-col items-center gap-4">
            <Heart className="w-12 h-12 text-muted-foreground/30" strokeWidth={1} />
            <p className="text-muted-foreground text-base">
              {ar ? "قائمة المفضلة فارغة حالياً." : "Your wishlist is empty."}
            </p>
            <Link
              to="/shop"
              className="mt-2 inline-block px-8 py-3 bg-foreground text-background text-xs font-semibold tracking-widest uppercase hover:bg-primary transition-colors"
            >
              {ar ? "تسوق الآن" : "SHOP NOW"}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {products.map((product) => (
              <LuxuryProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </StoreLayout>
  );
}

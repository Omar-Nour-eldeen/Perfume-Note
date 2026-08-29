import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag, ArrowRight, Shield, Truck, RotateCcw, Wind, Heart as HeartIcon, TreePine } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/lib/cart-store";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { useState } from "react";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductReviews } from "@/components/ProductReviews";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ context: { queryClient }, params: { id } }) => {
    await queryClient.ensureQueryData({
      queryKey: ["product", id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        return data as Product;
      },
    });
  },
  head: ({ params }) => ({
    meta: [
      { title: "PERFUME NOTE — تفاصيل المنتج" },
      { name: "description", content: "عطر فاخر من مجموعة PERFUME NOTE." },
    ],
    links: [{ rel: "canonical", href: `/product/${params.id}` }],
  }),
  component: ProductDetailPage,
});



function ProductDetailPage() {
  const { id } = Route.useParams();
  const { language } = useI18n();
  const ar = language === "ar";
  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);
  const [qty, setQty] = useState(1);

  const { data: product } = useSuspenseQuery<Product>({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Product;
    },
  });

  if (!product) {
    return (
      <StoreLayout>
        <main className="mx-auto max-w-7xl px-4 pt-32 text-center sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-foreground">
            {ar ? "المنتج غير موجود" : "Product not found"}
          </h1>
          <Button asChild className="mt-6 bg-primary text-white hover:bg-primary/90">
            <Link to="/">{ar ? "العودة للرئيسية" : "Back to home"}</Link>
          </Button>
        </main>
      </StoreLayout>
    );
  }

  const handleAddToCart = () => {
    const currentCartItem = useCartStore.getState().items.find(i => i.product.id === product.id);
    const totalRequested = (currentCartItem?.quantity || 0) + qty;
    const availableStock = Math.max(product.stock || 0, 0);

    if (totalRequested > availableStock) {
      toast.error(ar 
        ? `عذراً، الكمية المتوفرة في المخزون هي ${availableStock} فقط` 
        : `Sorry, only ${availableStock} items available in stock`
      );
      return;
    }

    const added = addItem(product, qty);
    if (!added) {
      toast.error(ar ? "الكمية المطلوبة غير متوفرة في المخزون" : "This product is out of stock");
      return;
    }
    toast.success(ar ? "تمت الإضافة للسلة" : "Added to cart", {
      description: ar
        ? `تم إضافة ${product.title_ar} إلى سلتك.`
        : `${product.title_en} has been added to your cart.`,
      position: "top-center",
    });
  };

  const image = product.images?.[0];
  const title = ar ? product.title_ar : product.title_en;
  const description = ar ? product.description_ar : product.description_en;
  const isOutOfStock = (product.stock || 0) === 0;

  return (
    <StoreLayout>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-32 lg:pb-20 pt-24">

        {/* Breadcrumb */}
        <div className="pt-6 mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="transition hover:text-primary">{ar ? "الرئيسية" : "Home"}</Link>
          <span>/</span>
          <Link to="/shop" className="transition hover:text-primary">{ar ? "المتجر" : "Shop"}</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">{title}</span>
        </div>

        {/* Main Product Grid */}
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">

          {/* ── Sticky Image Column ── */}
          <div className="lg:col-span-5 order-first lg:order-last">
            {/* sticky container */}
            <div className="sticky top-24">
              <ProductGallery images={product.images || []} title={title} />
            </div>
          </div>

          {/* ── Details Column ── */}
          <div className={`lg:col-span-7 flex flex-col order-last lg:order-first ${product.is_offer ? "border-2 border-red-600 rounded-2xl p-6" : ""}`}>

            {/* Brand label */}
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
              {ar ? "PERFUME NOTE" : "PERFUME NOTE"}
            </p>

            {/* Title */}
            {(product.badge_ar || product.badge_en) && (
              <span className={`self-start mb-3 px-3 py-1 rounded-full text-xs font-bold ${product.is_offer ? "bg-red-600 text-white" : "bg-primary text-primary-foreground"}`}>
                {ar ? product.badge_ar : product.badge_en}
              </span>
            )}
            <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl mb-2">
              {title}
            </h1>

            {/* Subtitle */}
            <p className="text-sm text-muted-foreground mb-6">
              {product.unit || (ar ? "عطر فاخر" : "Eau de Parfum")}
            </p>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-8 pb-8 border-b border-border/50">
              {product.is_offer && product.original_price && product.original_price > product.price && (
                <span className="text-lg font-semibold text-muted-foreground line-through">
                  {product.original_price.toFixed(2)} {ar ? "ج.م" : "EGP"}
                </span>
              )}
              <span className="text-4xl font-black text-primary">
                {product.price.toFixed(2)}
              </span>
              <span className="text-lg font-bold text-foreground/70">
                {ar ? "ج.م" : "EGP"}
              </span>
              {product.unit && (
                <span className="text-sm font-semibold text-muted-foreground">/ {product.unit}</span>
              )}
              {isOutOfStock && (
                <span className="ms-auto text-sm font-bold text-destructive bg-destructive/10 px-3 py-1 rounded-full">
                  {ar ? "نفدت الكمية" : "Out of Stock"}
                </span>
              )}
              {product.stock > 0 && product.stock < 10 && (
                <span className="ms-auto text-sm font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full">
                  {ar ? `متبقي ${product.stock} فقط` : `Only ${product.stock} left`}
                </span>
              )}
            </div>

            {/* Description */}
            {description && (
              <p className="text-base leading-loose text-muted-foreground mb-8">
                {description}
              </p>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-4 mb-6">
              <label className="text-sm font-bold text-foreground">{ar ? "الكمية" : "Qty"}:</label>
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  disabled={isOutOfStock}
                  className="w-10 h-10 flex items-center justify-center text-foreground hover:text-primary hover:bg-accent transition-colors text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >−</button>
                <span className="w-12 text-center font-bold text-foreground text-sm">{qty}</span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  disabled={isOutOfStock || qty >= (product.stock || 0)}
                  className="w-10 h-10 flex items-center justify-center text-foreground hover:text-primary hover:bg-accent transition-colors text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >+</button>
              </div>
            </div>

            {/* Add to Cart - hidden on mobile (shown in fixed bottom bar) */}
            <div className="hidden lg:flex flex-col gap-3">
              <Button
                onClick={handleAddToCart}
                disabled={isLoading || isOutOfStock}
                className="w-full bg-foreground text-background py-6 text-base font-bold hover:bg-foreground/90 transition-all duration-300 border border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isOutOfStock ? (
                  <>{ar ? "نفدت الكمية" : "Out of Stock"}</>
                ) : (
                  <>
                    <ShoppingBag className="h-5 w-5 me-2" />
                    {ar ? "أضف إلى السلة" : "Add to Cart"}
                  </>
                )}
              </Button>
            </div>



            {/* Back link */}
            <Link
              to="/shop"
              className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-primary self-start"
            >
              <ArrowRight className="h-4 w-4" />
              {ar ? "العودة للمجموعة" : "Back to collection"}
            </Link>
          </div>
        </div>

        {/* ── Fragrance Notes Section ── */}
        {(product.top_notes_ar || product.heart_notes_ar || product.base_notes_ar || product.top_notes_en || product.heart_notes_en || product.base_notes_en) && (
          <section className="mt-24 py-20 px-6 bg-card rounded-2xl border border-border/50">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
                {ar ? "تركيبة العطر" : "Composition"}
              </p>
              <h2 className="text-2xl md:text-3xl font-black text-foreground mb-16">
                {ar ? "الهرم العطري" : "Fragrance Pyramid"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                {/* Connecting line on desktop */}
                <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-px bg-border z-0" />
                
                {[
                  { icon: Wind, arLabel: "القمة", enLabel: "Top Notes", notes_ar: product.top_notes_ar, notes_en: product.top_notes_en },
                  { icon: HeartIcon, arLabel: "القلب", enLabel: "Heart Notes", notes_ar: product.heart_notes_ar, notes_en: product.heart_notes_en },
                  { icon: TreePine, arLabel: "القاعدة", enLabel: "Base Notes", notes_ar: product.base_notes_ar, notes_en: product.base_notes_en },
                ].map(({ icon: Icon, arLabel, enLabel, notes_ar, notes_en }) => {
                  if (!notes_ar && !notes_en) return null;
                  return (
                    <div key={arLabel} className="flex flex-col items-center gap-4 z-10">
                      <div className="w-20 h-20 rounded-full bg-background border border-primary/20 flex items-center justify-center shadow-sm">
                        <Icon className="h-7 w-7 text-primary" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground">{ar ? arLabel : enLabel}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{ar ? notes_ar : notes_en}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

      </main>

      {/* ── Reviews Section ── */}
      <ProductReviews productId={product.id} />

      {/* ── Mobile Fixed Bottom Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 p-4 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl lg:hidden">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{ar ? "السعر" : "Price"}</span>
          <span className="text-lg font-black text-primary">{product.price.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
        </div>
        <Button
          onClick={handleAddToCart}
          disabled={isLoading}
          className="flex-1 bg-foreground text-background py-4 text-sm font-bold hover:bg-foreground/90 transition-all"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <ShoppingBag className="h-5 w-5 me-2" />
              {ar ? "أضف إلى السلة" : "Add to Cart"}
            </>
          )}
        </Button>
      </div>
    </StoreLayout>
  );
}

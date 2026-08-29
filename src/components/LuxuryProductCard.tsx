import { Link } from "@tanstack/react-router";
import { useCartStore } from "@/lib/cart-store";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { useWishlistStore } from "@/lib/wishlist-store";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { Heart, ShoppingBag, Loader2, CheckCircle } from "lucide-react";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
}

export function LuxuryProductCard({ product }: ProductCardProps) {
  const { language } = useI18n();
  const ar = language === "ar";
  const { user } = useAuth();
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const { addToWishlist, removeFromWishlist, isWishlisted: isInStore } = useWishlistStore();
  const [isWishlisted, setIsWishlisted] = useState(() => isInStore(product.id));
  const [cartAdded, setCartAdded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (user) checkWishlist();
  }, [user]);

  const checkWishlist = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .maybeSingle();
    if (data) {
      setIsWishlisted(true);
      addToWishlist(product.id);
    }
  };

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error(ar ? "يجب تسجيل الدخول لإضافة المنتجات للمفضلة." : "Please log in to use wishlist.");
      return;
    }
    if (isWishlisted) {
      await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", product.id);
      setIsWishlisted(false);
      removeFromWishlist(product.id);
      toast(ar ? "تمت الإزالة من المفضلة" : "Removed from wishlist", {
        icon: "🗑️",
      });
    } else {
      await supabase.from("wishlists").insert({ user_id: user.id, product_id: product.id });
      setIsWishlisted(true);
      addToWishlist(product.id);
      toast(ar ? "تمت الإضافة للمفضلة ❤️" : "Added to wishlist ❤️", {
        description: ar ? product.title_ar : product.title_en,
      });
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const added = addItem(product, 1);
    if (!added) {
      toast.error(ar ? "الكمية المطلوبة غير متوفرة في المخزون" : "This product is out of stock");
      return;
    }

    // Fly-to-cart animation
    const image = product.images?.[0];
    if (imgRef.current && image) {
      const cartBtn = document.querySelector("[data-cart-trigger]") as HTMLElement;
      const imgRect = imgRef.current.getBoundingClientRect();
      const cartRect = cartBtn?.getBoundingClientRect();

      if (cartRect) {
        const fly = document.createElement("div");
        fly.style.cssText = `
          position: fixed;
          z-index: 9999;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          overflow: hidden;
          pointer-events: none;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          left: ${imgRect.left + imgRect.width / 2 - 32}px;
          top: ${imgRect.top + imgRect.height / 2 - 32}px;
          transition: none;
          border: 2px solid #fff;
        `;
        const img = document.createElement("img");
        img.src = image;
        img.style.cssText = "width: 100%; height: 100%; object-fit: cover;";
        fly.appendChild(img);
        document.body.appendChild(fly);

        // Force reflow
        fly.getBoundingClientRect();

        const tx = cartRect.left + cartRect.width / 2 - (imgRect.left + imgRect.width / 2);
        const ty = cartRect.top + cartRect.height / 2 - (imgRect.top + imgRect.height / 2);

        fly.style.transition = "all 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        fly.style.transform = `translate(${tx}px, ${ty}px) scale(0.12)`;
        fly.style.opacity = "0";
        fly.style.boxShadow = "0 0 0 rgba(0,0,0,0)";

        setTimeout(() => {
          fly.remove();
        }, 750);
      }
    }

    setCartAdded(true);

    const title = ar ? product.title_ar : product.title_en;
    const img = product.images?.[0];

    toast.custom(() => (
      <div
        dir={ar ? "rtl" : "ltr"}
        className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-border shadow-xl rounded-xl px-4 py-3 min-w-[280px]"
      >
        {img && (
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-border">
            <img src={img} alt={title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {ar ? "تمت الإضافة إلى السلة ✓" : "Added to cart ✓"}
          </p>
        </div>
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
      </div>
    ), { duration: 2500 });

    setTimeout(() => setCartAdded(false), 1800);
  };

  const image = product.images?.[0];
  const title = ar ? product.title_ar : product.title_en;
  const description = ar ? product.description_ar : product.description_en;

  return (
<article className={`group flex flex-col bg-[#fcfaf8] dark:bg-zinc-900/50 rounded-[24px] overflow-hidden border-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[3px] hover:shadow-[0_16px_45px_rgba(62,49,40,0.08)] ${product.is_offer ? "border-red-600" : "border-border/40 hover:border-[#4a3b32]/20"}`}>

  {/* Image */}
  <Link
    to="/product/$id"
    params={{ id: product.id }}
    className="relative block bg-secondary overflow-hidden"
    style={{ aspectRatio: "4/3" }}
  >
    {/* Product badge */}
    {(product.badge_ar || product.badge_en || product.is_featured) && (
      <div className="absolute top-4 start-4 z-10 bg-[#4a3b32]/90 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-full tracking-wider shadow-sm transition-all duration-500 ease-out group-hover:bg-[#4a3b32] flex items-center gap-1.5">
        {!product.is_offer && product.is_featured && <span className="text-yellow-400">⭐</span>}
        {ar ? (product.badge_ar || "مميز") : (product.badge_en || "FEATURED")}
      </div>
    )}

    {image ? (
      <img
        ref={imgRef}
        src={image}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.035]"
        loading="lazy"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <ShoppingBag
          className="w-10 h-10 text-muted-foreground/30 transition-transform duration-700 ease-out group-hover:scale-105"
          strokeWidth={1}
        />
      </div>
    )}

    {/* Very subtle overlay */}
    <div className="absolute inset-0 bg-black/[0.015] opacity-0 transition-opacity duration-700 group-hover:opacity-100 pointer-events-none" />
  </Link>

  {/* Content */}
  <div className="flex flex-col flex-1 p-5">

    <Link
      to="/product/$id"
      params={{ id: product.id }}
      className="flex flex-col flex-1 mb-5"
    >
      <span className="text-[11px] font-semibold text-muted-foreground/80 tracking-widest uppercase mb-1.5 transition-colors duration-400 group-hover:text-[#4a3b32]">
        {ar ? "عطر فاخر" : "Luxury Fragrance"}
      </span>

      <h3 className="text-lg font-bold text-foreground tracking-wide leading-snug transition-colors duration-400 group-hover:text-[#4a3b32]">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
          {description}
        </p>
      )}

      <div className="mt-auto pt-4 flex items-baseline gap-1.5">
        {product.is_offer && product.original_price && product.original_price > product.price && (
          <span className="text-sm font-semibold text-muted-foreground line-through">
            {product.original_price.toFixed(0)} {ar ? "ج.م" : "EGP"}
          </span>
        )}
        <span className="text-2xl font-black text-foreground">
          {product.price.toFixed(0)}
        </span>

        <span className="text-sm font-semibold text-muted-foreground">
          {ar ? "ج.م" : "EGP"}
        </span>
        {product.unit && (
          <span className="text-xs font-semibold text-muted-foreground/80">/ {product.unit}</span>
        )}
        {product.stock > 0 && product.stock < 10 && (
          <span className="ms-auto text-xs font-bold text-orange-600 dark:text-orange-400">
            {ar ? `متبقي ${product.stock} فقط` : `Only ${product.stock} left`}
          </span>
        )}
      </div>
    </Link>

    {/* Actions */}
    <div className="flex flex-col gap-3">

      <div className="flex items-center gap-3">

        {/* Wishlist */}
        <button
          onClick={toggleWishlist}
          className={`w-12 h-12 flex-shrink-0 rounded-2xl border transition-all duration-400 ease-out flex items-center justify-center ${
            isWishlisted
              ? "bg-red-50 border-red-100 text-red-500 dark:bg-red-500/10 dark:border-red-500/20"
              : "bg-white dark:bg-zinc-800 border-border/50 text-muted-foreground hover:border-red-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          }`}
          aria-label="Wishlist"
        >
          <Heart
            className={`w-5 h-5 transition-transform duration-500 ease-out ${
              isWishlisted
                ? "fill-red-500 text-red-500 scale-110"
                : "group-hover:scale-105"
            }`}
            strokeWidth={isWishlisted ? 2 : 1.5}
          />
        </button>

        {/* Add To Cart */}
        <button
          onClick={handleAddToCart}
          disabled={isLoading || (product.stock || 0) <= 0}
          className={`flex-1 h-12 rounded-2xl text-sm font-bold tracking-widest uppercase transition-all duration-400 ease-out flex items-center justify-center gap-2 ${
            (product.stock || 0) <= 0
              ? "bg-zinc-200 text-zinc-500 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-500"
              : cartAdded
              ? "bg-green-600 text-white"
              : "bg-[#3e3128] dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-[#2f251f] dark:hover:bg-white hover:shadow-[0_8px_20px_rgba(62,49,40,0.15)] active:scale-[0.985]"
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (product.stock || 0) <= 0 ? (
            <span>{ar ? "نفدت الكمية" : "OUT OF STOCK"}</span>
          ) : cartAdded ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>{ar ? "تمت الإضافة" : "ADDED"}</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" strokeWidth={2} />
              <span>{ar ? "أضف للسلة" : "ADD TO CART"}</span>
            </>
          )}
        </button>

      </div>

      {/* Details */}
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="w-full h-11 rounded-xl text-sm font-semibold tracking-widest uppercase flex items-center justify-center transition-all duration-500 ease-out border border-border/60 text-foreground hover:bg-[#3e3128] hover:border-[#3e3128] hover:text-white dark:hover:bg-zinc-100 dark:hover:border-zinc-100 dark:hover:text-zinc-900"
      >
        {ar ? "التفاصيل" : "VIEW DETAILS"}
      </Link>

    </div>
  </div>
</article>
  );
}

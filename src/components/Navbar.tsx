import { Link, useRouterState } from "@tanstack/react-router";
import { CartDrawer } from "@/components/CartDrawer";
import { SearchDialog } from "@/components/SearchDialog";
import { useI18n } from "@/lib/i18n";
import { siteAssets } from "@/lib/site-assets";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Search, User, Heart } from "lucide-react";
import { useWishlistStore } from "@/lib/wishlist-store";
import { useCartStore } from "@/lib/cart-store";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";

interface NavbarProps {
  /** Start transparent (for hero pages), solid on scroll */
  transparent?: boolean;
}

export function Navbar({ transparent = false }: NavbarProps) {
  const { language, setLanguage } = useI18n();
  const ar = language === "ar";
  const { user, profile, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const queryClient = useQueryClient();

  const wishlistIds = useWishlistStore((s) => s.productIds);
  const removeFromWishlist = useWishlistStore((s) => s.removeFromWishlist);
  const cartItems = useCartStore((s) => s.items);
  const removeCartItem = useCartStore((s) => s.removeItem);
  const syncCartProduct = useCartStore((s) => s.syncProduct);

  const wishlistCount = wishlistIds.length;

  // Global sync: Check active status of cart & wishlist items on mount
  useEffect(() => {
    const syncActiveStatus = async () => {
      const allIds = new Set([
        ...wishlistIds,
        ...cartItems.map((i) => i.product.id),
      ]);

      if (allIds.size === 0) return;

      const { data } = await supabase
        .from("products")
        .select("id, is_active")
        .in("id", Array.from(allIds));

      if (data) {
        data.forEach((dbProduct) => {
          if (!dbProduct.is_active) {
            removeCartItem(dbProduct.id);
            removeFromWishlist(dbProduct.id);
          }
        });
      }
    };
    syncActiveStatus();

    // Listen for realtime product updates (deactivations, price changes, deletions)
    // Uses getState() so handlers are always fresh even with empty deps array
    const channel = supabase
      .channel('products-global-watch')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => {
          const updatedProduct = payload.new as any;
          if (updatedProduct.is_active === false) {
            useCartStore.getState().removeItem(updatedProduct.id);
            useWishlistStore.getState().removeFromWishlist(updatedProduct.id);
          } else {
            useCartStore.getState().syncProduct(updatedProduct);
          }
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'products' },
        (payload) => {
          if (payload.old?.id) {
            useCartStore.getState().removeItem(payload.old.id);
            useWishlistStore.getState().removeFromWishlist(payload.old.id);
          }
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'products' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // mount only — handlers use getState() for fresh data

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const toggleLanguage = () => setLanguage(language === "en" ? "ar" : "en");

  const navLinks = [
    { label: ar ? "الرئيسية" : "Home", to: "/" as const },
    { label: ar ? "المتجر" : "Shop", to: "/shop" as const },
    { label: ar ? "اكتشف عطرك" : "Find Your Scent", to: "/quiz" as const },
    { label: ar ? "عنا" : "About", to: "/about" as const },
  ];

  const isSolid = !transparent || scrolled;
  const avatarUrl =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture;

  const navLinkClass = (to: string) =>
    cn(
      "text-[13px] font-medium transition-colors link-underline",
      ar ? "font-['Tajawal']" : "tracking-widest uppercase",
      !isSolid
        ? pathname === to || (to !== "/" && pathname.startsWith(to))
          ? "text-white"
          : "text-white/75 hover:text-white"
        : pathname === to || (to !== "/" && pathname.startsWith(to))
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
    );

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-500 border-b",
          isSolid
            ? "bg-background/95 backdrop-blur-md shadow-sm border-border/40 py-4"
            : "bg-transparent border-transparent py-6 md:py-8"
        )}
      >
        <div className="max-w-screen-xl mx-auto px-6 md:px-10 flex items-center justify-between relative">

          {/* Logo */}
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 z-10 hover:opacity-80 transition-opacity"
          >
            <img
              src={siteAssets.logo}
              alt="Perfume Note"
              className={cn(
                "h-9 w-9 md:h-10 md:w-10 rounded-full object-cover",
                !isSolid && "ring-2 ring-white/30"
              )}
            />
            <span className={cn(
              "text-sm md:text-base font-bold tracking-[0.2em] uppercase transition-colors",
              ar ? "font-['Tajawal'] tracking-normal" : "",
              isSolid ? "text-foreground" : "text-white drop-shadow-md"
            )}>
              {ar ? "بيرفيوم نوت" : "PERFUME NOTE"}
            </span>
          </Link>

          {/* Centered Navigation — Desktop */}
          <nav className="hidden md:flex items-center gap-10 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {navLinks.map(({ label, to }) => (
              <Link key={to} to={to} className={navLinkClass(to)}>
                {label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4 md:gap-5 z-10">
            <button
              onClick={() => setSearchOpen(true)}
              className={cn(
                "transition-colors",
                isSolid ? "text-muted-foreground hover:text-foreground" : "text-white/80 hover:text-white"
              )}
              aria-label="Search"
            >
              <Search className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </button>

            <button
              onClick={toggleLanguage}
              className={cn(
                "hidden md:block text-[11px] font-semibold tracking-widest transition-colors uppercase",
                isSolid ? "text-muted-foreground hover:text-foreground" : "text-white/80 hover:text-white"
              )}
            >
              {ar ? "EN" : "عربي"}
            </button>

            <div className="text-muted-foreground hover:text-foreground transition-colors">
              <CartDrawer />
            </div>

            {/* Wishlist icon — desktop */}
            {user && (
              <Link
                to="/wishlist"
                className={cn(
                  "relative transition-colors",
                  isSolid ? "text-muted-foreground hover:text-foreground" : "text-white/80 hover:text-white"
                )}
                aria-label={ar ? "المفضلة" : "Wishlist"}
              >
                <Heart className="w-[18px] h-[18px]" strokeWidth={1.5} />
                {wishlistCount > 0 && (
                  <span
                    key={wishlistCount}
                    className="absolute -top-2 -end-2 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce-once"
                  >
                    {wishlistCount}
                  </span>
                )}
              </Link>
            )}

            {/* Notifications icon — desktop */}
            <NotificationBell isSolid={isSolid} />

            {/* Auth — Desktop */}
            {!loading && (
              <div className="hidden md:flex items-center gap-2">
                {user ? (
                  <Link
                    to="/account"
                    className="w-9 h-9 rounded-full overflow-hidden border-2 border-primary/30 hover:border-primary transition-colors bg-secondary flex items-center justify-center"
                    title={ar ? "حسابي" : "My Account"}
                  >
                    <Avatar className="w-full h-full">
                      <AvatarImage src={avatarUrl || ""} alt="Profile" className="object-cover" />
                      <AvatarFallback className="bg-transparent">
                        <User className="w-[18px] h-[18px] text-muted-foreground" strokeWidth={1.5} />
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/auth/login"
                      className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
                    >
                      {ar ? "دخول" : "Login"}
                    </Link>
                    <Link
                      to="/auth/register"
                      className="text-[11px] font-semibold tracking-widest uppercase bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-4 py-1.5"
                    >
                      {ar ? "تسجيل" : "Register"}
                    </Link>
                  </>
                )}
              </div>
            )}

            <button
              onClick={toggleLanguage}
              className={cn(
                "md:hidden text-[11px] font-semibold tracking-widest transition-colors uppercase",
                isSolid ? "text-muted-foreground hover:text-foreground" : "text-white/80 hover:text-white"
              )}
              aria-label={ar ? "Switch to English" : "تبديل إلى العربية"}
            >
              {ar ? "EN" : "عربي"}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-background flex flex-col justify-center px-8 transition-all duration-500 md:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <nav className="flex flex-col gap-6 mb-8 items-center">
          {navLinks.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "text-2xl transition-colors font-medium",
                ar ? "font-['Tajawal']" : "font-serif uppercase tracking-widest",
                pathname === to ? "text-primary" : "text-foreground hover:text-primary/70"
              )}
            >
              {label}
            </Link>
          ))}
          {user && (
            <Link
              to="/wishlist"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "text-2xl transition-colors font-medium",
                ar ? "font-['Tajawal']" : "font-serif uppercase tracking-widest",
                pathname === "/wishlist" ? "text-primary" : "text-foreground hover:text-primary/70"
              )}
            >
              {ar ? "المفضلة" : "Wishlist"}
            </Link>
          )}
        </nav>

        <div className="flex flex-col items-center gap-4 mt-8">
          {!loading && (
            user ? (
              <Link
                to="/account"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 text-sm text-foreground uppercase tracking-widest"
              >
                <div className="w-10 h-10 rounded-full border-2 border-primary/30 overflow-hidden bg-secondary flex items-center justify-center">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={avatarUrl || ""} alt="Profile" className="object-cover" />
                    <AvatarFallback className="bg-transparent">
                      <User className="w-[18px] h-[18px] text-muted-foreground" strokeWidth={1.5} />
                    </AvatarFallback>
                  </Avatar>
                </div>
                {ar ? "حسابي" : "My Account"}
              </Link>
            ) : (
              <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                <Link
                  to="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center text-sm font-semibold text-foreground uppercase tracking-widest border border-border py-3 hover:bg-secondary transition-colors"
                >
                  {ar ? "تسجيل الدخول" : "Login"}
                </Link>
                <Link
                  to="/auth/register"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center text-sm font-semibold bg-primary text-primary-foreground uppercase tracking-widest py-3 hover:bg-primary/90 transition-colors"
                >
                  {ar ? "إنشاء حساب" : "Register"}
                </Link>
              </div>
            )
          )}
          <button
            onClick={() => { toggleLanguage(); setMobileOpen(false); }}
            className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mt-4"
          >
            {ar ? "English" : "العربية"}
          </button>
        </div>
      </div>

      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
    </>
  );
}

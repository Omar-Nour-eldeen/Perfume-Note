import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Store, Sparkles, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function MobileBottomNav() {
  const { language } = useI18n();
  const ar = language === "ar";
  const { user, profile } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const avatarUrl = user
    ? profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || ""
    : "";

  const navItems = [
    {
      id: "home",
      label: ar ? "الرئيسية" : "Home",
      to: "/" as const,
      icon: Home,
      isActive: pathname === "/",
    },
    {
      id: "shop",
      label: ar ? "المتجر" : "Shop",
      to: "/shop" as const,
      icon: Store,
      isActive: pathname.startsWith("/shop"),
    },
    {
      id: "discover",
      label: ar ? "اكتشف عطرك" : "Find Your Scent",
      to: "/quiz" as const,
      icon: Sparkles,
      isActive: pathname === "/quiz",
    },
    {
      id: "about",
      label: ar ? "عنا" : "About",
      to: "/about" as const,
      icon: User,
      isActive: pathname === "/about",
    },
    {
      id: "account",
      label: ar ? "حسابي" : "Account",
      to: user ? ("/account" as const) : ("/auth/login" as const),
      icon: User,
      isActive: pathname === "/account" || pathname.startsWith("/auth"),
    },
  ];

  return (
    <aside className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-background/95 backdrop-blur-md border-t border-border/50 shadow-sm pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 px-1">
      <nav className="flex items-center justify-around h-12">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isItemActive = item.isActive;

          const content = (
            <div className="relative flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors">
              <div className="relative flex items-center justify-center">
                {item.id === "account" && user ? (
                  <div className="w-[22px] h-[22px] rounded-full overflow-hidden border border-primary/30 bg-secondary ring-1 ring-primary/10">
                    <Avatar className="w-full h-full">
                      <AvatarImage src={avatarUrl || ""} alt="Profile" className="object-cover" />
                      <AvatarFallback className="bg-transparent">
                        <User className="w-[14px] h-[14px] text-muted-foreground" strokeWidth={1.5} />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ) : (
                  <Icon
                    className={cn(
                      "w-[18px] h-[18px] transition-all duration-200",
                      isItemActive
                        ? "text-primary scale-105"
                        : "text-muted-foreground/80 group-hover:text-foreground"
                    )}
                    strokeWidth={isItemActive ? 2.2 : 1.6}
                  />
                )}
                {!!item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -end-2.5 flex items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold leading-none shadow-sm">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] leading-tight tracking-tight transition-colors whitespace-nowrap text-center",
                  ar ? "font-['Tajawal']" : "",
                  isItemActive ? "text-primary font-bold" : "text-muted-foreground/80 font-medium"
                )}
              >
                {item.label}
              </span>
              {isItemActive && (
                <span className="absolute top-0 w-4 h-[2px] rounded-full bg-primary" />
              )}
            </div>
          );

          if (item.onClick) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="flex-1 flex flex-col items-center justify-center h-full group focus:outline-none"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              to={item.to!}
              className="flex-1 flex flex-col items-center justify-center h-full group focus:outline-none"
            >
              {content}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

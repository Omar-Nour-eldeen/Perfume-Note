import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { siteAssets } from "@/lib/site-assets";
import { LayoutDashboard, ShoppingBag, ClipboardList, Percent, Truck, MessageSquare, Home, Layers, Languages } from "lucide-react";
import type { ReactNode } from "react";
import { NotificationBell } from "@/components/NotificationBell";

export function AdminLayout({ children }: { children: ReactNode }) {
  const { language, setLanguage } = useI18n();
  const ar = language === "ar";

  const menuItems = [
    { icon: LayoutDashboard, label: ar ? "الرئيسية" : "Overview", href: "/admin" },
    { icon: ShoppingBag, label: ar ? "المنتجات" : "Products", href: "/admin/products" },
    { icon: Layers, label: ar ? "الأقسام" : "Categories", href: "/admin/categories" },
    { icon: ClipboardList, label: ar ? "الطلبات" : "Orders", href: "/admin/orders" },
    { icon: Percent, label: ar ? "أكواد الخصم" : "Coupons", href: "/admin/discounts" },
    { icon: Truck, label: ar ? "مصاريف الشحن" : "Shipping", href: "/admin/shipping" },
    { icon: MessageSquare, label: ar ? "المحادثات" : "Chats", href: "/admin/chat" },
  ];

  return (
    <div className="min-h-screen bg-secondary/10 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="sticky top-0 z-40 w-full md:w-64 bg-card border-b md:border-b-0 md:border-e border-border p-3 md:p-6 flex-shrink-0 md:h-screen md:overflow-y-auto">
        <div className="flex items-center justify-center md:justify-start gap-3 mb-3 md:mb-8">
          <img src={siteAssets.logo} alt="logo" className="h-10 w-10 rounded-full object-cover" />
          <div>
            <h2 className="font-black text-foreground text-base leading-tight">
              {ar ? "لوحة الإدارة" : "Admin Panel"}
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Perfume Note
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-3 md:mb-6">
          <button
            type="button"
            onClick={() => setLanguage(ar ? "en" : "ar")}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-foreground border border-border rounded-xl hover:bg-secondary/50 transition"
            aria-label={ar ? "Switch to English" : "التبديل إلى العربية"}
          >
            <Languages className="h-4 w-4" />
            <span>{ar ? "English" : "العربية"}</span>
          </button>

          <div className="flex items-center justify-center px-3 border border-border rounded-xl bg-background">
            <NotificationBell isSolid={true} />
          </div>
        </div>

        <nav className="flex flex-wrap md:block gap-1.5 pb-1 md:space-y-1 md:pb-0">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              activeOptions={{ exact: item.href === "/admin" }}
              activeProps={{ className: "bg-primary/10 text-primary" }}
              inactiveProps={{ className: "text-foreground/80 hover:bg-secondary/50 hover:text-foreground" }}
              className="flex min-w-max md:w-full items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-xl transition"
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}

          <Link
            to="/"
            className="flex min-w-max md:w-full items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-bold text-muted-foreground hover:bg-secondary/50 rounded-xl transition md:pt-6 md:border-t md:border-border/50 md:mt-4"
          >
            <Home className="h-5 w-5 flex-shrink-0" />
            <span>{ar ? "العودة للمتجر" : "Back to Store"}</span>
          </Link>
        </nav>
      </aside>

      {/* Content wrapper */}
      <main className="min-w-0 flex-1 p-4 md:p-10 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

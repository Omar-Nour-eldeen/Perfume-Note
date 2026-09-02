import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/lib/i18n";
import { ShoppingBag, ClipboardList, Wallet, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const { language } = useI18n();
  const ar = language === "ar";
  const [stats, setStats] = useState({
    productsCount: 0,
    ordersCount: 0,
    totalSales: 0,
    pendingReturns: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { count: pCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      const { count: oCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });

      const { data: orders } = await supabase
        .from("orders")
        .select("total")
        .eq("status", "delivered");

      const { count: rCount } = await supabase
        .from("returns")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const sales = (orders || []).reduce((sum, order) => sum + Number(order.total), 0);

      setStats({
        productsCount: pCount || 0,
        ordersCount: oCount || 0,
        totalSales: sales,
        pendingReturns: rCount || 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Real-time subscriptions for dashboard overview
    const ordersChannel = supabase
      .channel("admin_dashboard_orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchStats();
      })
      .subscribe();

    const returnsChannel = supabase
      .channel("admin_dashboard_returns")
      .on("postgres_changes", { event: "*", schema: "public", table: "returns" }, () => {
        fetchStats();
      })
      .subscribe();

    const productsChannel = supabase
      .channel("admin_dashboard_products")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(returnsChannel);
      supabase.removeChannel(productsChannel);
    };
  }, []);

  const cards = [
    {
      icon: ShoppingBag,
      label: ar ? "إجمالي المنتجات" : "Total Products",
      value: stats.productsCount,
      color: "bg-blue-500/10 text-blue-500",
      href: "/admin/products",
    },
    {
      icon: ClipboardList,
      label: ar ? "إجمالي الطلبات" : "Total Orders",
      value: stats.ordersCount,
      color: "bg-orange-500/10 text-orange-500",
      href: "/admin/orders?tab=orders",
    },
    {
      icon: Wallet,
      label: ar ? "المبيعات المكتملة" : "Delivered Sales",
      value: `${stats.totalSales.toFixed(2)} ${ar ? "ج.م" : "EGP"}`,
      color: "bg-green-500/10 text-green-500",
      href: "/admin/orders?tab=orders",
    },
    {
      icon: ArrowUpRight,
      label: ar ? "طلبات الإرجاع المعلقة" : "Pending Returns",
      value: stats.pendingReturns,
      color: "bg-red-500/10 text-red-500",
      href: "/admin/orders?tab=returns",
    },
  ];

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-black text-foreground">
              {ar ? "نظرة عامة" : "Overview"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {ar ? "مراقبة وإدارة أداء متجرك ومبيعاته" : "Monitor and manage your store performance and sales"}
            </p>
          </div>

          {loading ? (
            <span className="text-muted-foreground">{ar ? "جاري تحميل البيانات..." : "Loading stats..."}</span>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((card) => (
                <Link
                  key={card.label}
                  to={card.href}
                  className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-4 hover:border-primary transition-colors cursor-pointer"
                >
                  <div className={`p-4 rounded-xl ${card.color}`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-muted-foreground block">{card.label}</span>
                    <span className="text-xl font-black text-foreground mt-1 block">{card.value}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}

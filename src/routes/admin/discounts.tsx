import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DiscountCode } from "@/lib/types";
import { toast } from "sonner";
import { Plus, Edit2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/discounts")({
  component: AdminDiscounts,
});

function AdminDiscounts() {
  const { language } = useI18n();
  const ar = language === "ar";
  const [coupons, setCoupons] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<DiscountCode | null>(null);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState("");
  const [minOrder, setMinOrder] = useState("");

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("discount_codes")
        .select("*")
        .order("created_at", { ascending: false });
      setCoupons(data as DiscountCode[] || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCoupon(null);
    setCode("");
    setType("percentage");
    setValue("");
    setMinOrder("");
    setShowModal(true);
  };

  const openEditModal = (coupon: DiscountCode) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setType(coupon.type);
    setValue(coupon.value.toString());
    setMinOrder(coupon.min_order.toString());
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !value || !minOrder) return;

    const payload = {
      code: code.toUpperCase(),
      type,
      value: parseFloat(value),
      min_order: parseFloat(minOrder),
      is_active: true,
    };

    try {
      if (editingCoupon) {
        const { error } = await supabase
          .from("discount_codes")
          .update(payload)
          .eq("id", editingCoupon.id);
        if (error) throw error;
        toast.success(ar ? "تم تحديث الكود بنجاح" : "Coupon updated successfully");
      } else {
        const { error } = await supabase
          .from("discount_codes")
          .insert(payload);
        if (error) throw error;
        toast.success(ar ? "تم إضافة كود جديد" : "Coupon added successfully");
      }
      setShowModal(false);
      fetchCoupons();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(ar ? "هل أنت متأكد من حذف هذا الكود؟" : "Are you sure you want to delete this coupon?")) return;
    try {
      const { error } = await supabase
        .from("discount_codes")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success(ar ? "تم حذف الكود بنجاح" : "Coupon deleted successfully");
      fetchCoupons();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-black text-foreground">
                {ar ? "إدارة أكواد الخصم" : "Manage Coupons"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {ar ? "إنشاء وتعديل كوبونات الخصم للعملاء" : "Create and edit discount coupons for customers"}
              </p>
            </div>
            <Button onClick={openAddModal} className="bg-primary text-white flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              {ar ? "إضافة كود" : "Add Coupon"}
            </Button>
          </div>

          {loading ? (
            <span className="text-muted-foreground">{ar ? "جاري التحميل..." : "Loading..."}</span>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border text-xs font-bold text-muted-foreground text-start">
                    <th className="p-4 text-start">{ar ? "الكود" : "Code"}</th>
                    <th className="p-4 text-start">{ar ? "النوع" : "Type"}</th>
                    <th className="p-4 text-start">{ar ? "القيمة" : "Value"}</th>
                    <th className="p-4 text-start">{ar ? "الحد الأدنى للطلب" : "Min Order"}</th>
                    <th className="p-4 text-start">{ar ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-secondary/10">
                      <td className="p-4 font-bold text-foreground">{coupon.code}</td>
                      <td className="p-4 text-muted-foreground">{coupon.type}</td>
                      <td className="p-4 font-black text-primary">
                        {coupon.value} {coupon.type === "percentage" ? "%" : "ج.م"}
                      </td>
                      <td className="p-4 font-semibold text-foreground">
                        {coupon.min_order.toFixed(2)} {ar ? "ج.م" : "EGP"}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditModal(coupon)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(coupon.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Form */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
            <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-black text-foreground">
                {editingCoupon ? (ar ? "تعديل الكود" : "Edit Coupon") : (ar ? "إضافة كود جديد" : "Add New Coupon")}
              </h3>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "كود الخصم" : "Discount Code"}</label>
                <Input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="E.g. GOLD20" className="bg-background text-foreground text-sm uppercase" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "النوع" : "Discount Type"}</label>
                <Select value={type} onValueChange={(val: any) => setType(val)}>
                  <SelectTrigger className="w-full bg-background border-border text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{ar ? "نسبة مئوية (%)" : "Percentage (%)"}</SelectItem>
                    <SelectItem value="fixed">{ar ? "مبلغ ثابت" : "Fixed Amount"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "القيمة" : "Value"}</label>
                  <Input type="number" step="0.01" required value={value} onChange={(e) => setValue(e.target.value)} className="bg-background text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "الحد الأدنى للطلب" : "Min Order"}</label>
                  <Input type="number" step="0.01" required value={minOrder} onChange={(e) => setMinOrder(e.target.value)} className="bg-background text-foreground text-sm" />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-primary text-white">
                  {ar ? "حفظ الكود" : "Save Coupon"}
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                  {ar ? "إلغاء" : "Cancel"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
}

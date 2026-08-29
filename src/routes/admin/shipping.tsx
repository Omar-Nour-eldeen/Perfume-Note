import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ShippingZone } from "@/lib/types";
import { toast } from "sonner";
import { Plus, Edit2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/shipping")({
  component: AdminShipping,
});

function AdminShipping() {
  const { language } = useI18n();
  const ar = language === "ar";
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [cost, setCost] = useState("");

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("shipping_zones")
        .select("*")
        .order("created_at", { ascending: false });
      setZones(data as ShippingZone[] || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingZone(null);
    setNameAr("");
    setNameEn("");
    setCost("");
    setShowModal(true);
  };

  const openEditModal = (zone: ShippingZone) => {
    setEditingZone(zone);
    setNameAr(zone.name_ar);
    setNameEn(zone.name_en);
    setCost(zone.cost.toString());
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || !nameEn.trim() || !cost) return;

    const payload = {
      name_ar: nameAr,
      name_en: nameEn,
      cost: parseFloat(cost),
    };

    try {
      if (editingZone) {
        const { error } = await supabase
          .from("shipping_zones")
          .update(payload)
          .eq("id", editingZone.id);
        if (error) throw error;
        toast.success(ar ? "تم تحديث منطقة الشحن" : "Shipping zone updated successfully");
      } else {
        const { error } = await supabase
          .from("shipping_zones")
          .insert(payload);
        if (error) throw error;
        toast.success(ar ? "تم إضافة منطقة شحن جديدة" : "Shipping zone added successfully");
      }
      setShowModal(false);
      fetchZones();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(ar ? "هل أنت متأكد من حذف هذه المنطقة؟" : "Are you sure you want to delete this zone?")) return;
    try {
      const { error } = await supabase
        .from("shipping_zones")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success(ar ? "تم حذف المنطقة بنجاح" : "Shipping zone deleted successfully");
      fetchZones();
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
                {ar ? "مناطق الشحن" : "Shipping Zones"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {ar ? "تحديد تكاليف الشحن حسب المناطق والمدن" : "Define shipping costs based on zones and cities"}
              </p>
            </div>
            <Button onClick={openAddModal} className="bg-primary text-white flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              {ar ? "إضافة منطقة" : "Add Zone"}
            </Button>
          </div>

          {loading ? (
            <span className="text-muted-foreground">{ar ? "جاري التحميل..." : "Loading..."}</span>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border text-xs font-bold text-muted-foreground text-start">
                    <th className="p-4 text-start">{ar ? "المنطقة (عربي)" : "Zone (Arabic)"}</th>
                    <th className="p-4 text-start">{ar ? "المنطقة (إنجليزي)" : "Zone (English)"}</th>
                    <th className="p-4 text-start">{ar ? "تكلفة الشحن" : "Shipping Cost"}</th>
                    <th className="p-4 text-start">{ar ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {zones.map((zone) => (
                    <tr key={zone.id} className="hover:bg-secondary/10">
                      <td className="p-4 font-bold text-foreground">{zone.name_ar}</td>
                      <td className="p-4 text-muted-foreground">{zone.name_en}</td>
                      <td className="p-4 font-black text-primary">
                        {zone.cost.toFixed(2)} {ar ? "ج.م" : "EGP"}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditModal(zone)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(zone.id)}>
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
                {editingZone ? (ar ? "تعديل المنطقة" : "Edit Zone") : (ar ? "إضافة منطقة جديدة" : "Add New Zone")}
              </h3>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "المنطقة بالعربي" : "Zone (Arabic)"}</label>
                <Input required value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="مثال: القاهرة" className="bg-background text-foreground text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "المنطقة بالإنجليزي" : "Zone (English)"}</label>
                <Input required value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="E.g. Cairo" className="bg-background text-foreground text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "تكلفة الشحن" : "Shipping Cost"}</label>
                <Input type="number" step="0.01" required value={cost} onChange={(e) => setCost(e.target.value)} className="bg-background text-foreground text-sm" />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-primary text-white">
                  {ar ? "حفظ التغييرات" : "Save Changes"}
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

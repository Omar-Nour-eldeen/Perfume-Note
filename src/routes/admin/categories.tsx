import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Category } from "@/lib/types";
import { toast } from "sonner";
import { Plus, Edit2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

function AdminCategories() {
  const { language } = useI18n();
  const ar = language === "ar";
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCategories(data as Category[] || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCategory(null);
    setNameAr("");
    setNameEn("");
    setSlug("");
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setNameAr(category.name_ar);
    setNameEn(category.name_en);
    setSlug(category.slug);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || !nameEn.trim() || !slug.trim()) return;

    const payload = {
      name_ar: nameAr,
      name_en: nameEn,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
    };

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", editingCategory.id);
        if (error) throw error;
        toast.success(ar ? "تم تعديل القسم بنجاح" : "Category updated successfully");
      } else {
        const { error } = await supabase
          .from("categories")
          .insert(payload);
        if (error) throw error;
        toast.success(ar ? "تم إضافة القسم بنجاح" : "Category added successfully");
      }
      setShowModal(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(ar ? "فشل حفظ القسم" : "Failed to save category", {
        description: err.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(ar ? "هل أنت متأكد من حذف هذا القسم؟ (قد يؤثر على المنتجات المرتبطة به)" : "Are you sure you want to delete this category? (It may affect linked products)")) return;
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success(ar ? "تم حذف القسم بنجاح" : "Category deleted successfully");
      fetchCategories();
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
                {ar ? "إدارة الأقسام والمجموعات" : "Manage Categories & Collections"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {ar ? "إضافة وتعديل أقسام المتجر (مثال: عطور رجالية، عروض، تشكيلة مختارة)" : "Add and edit store categories (e.g. Men's, Offers, Featured Selection)"}
              </p>
            </div>
            <Button onClick={openAddModal} className="bg-primary text-white flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              {ar ? "إضافة قسم" : "Add Category"}
            </Button>
          </div>

          {loading ? (
            <span className="text-muted-foreground">{ar ? "جاري تحميل الأقسام..." : "Loading categories..."}</span>
          ) : (
            <>
            <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border text-xs font-bold text-muted-foreground text-start">
                    <th className="p-4 text-start">{ar ? "الاسم (عربي)" : "Name (AR)"}</th>
                    <th className="p-4 text-start">{ar ? "الاسم (إنجليزي)" : "Name (EN)"}</th>
                    <th className="p-4 text-start">Slug</th>
                    <th className="p-4 text-start">{ar ? "التحكم" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-secondary/10">
                      <td className="p-4 font-bold text-foreground">{category.name_ar}</td>
                      <td className="p-4 text-foreground">{category.name_en}</td>
                      <td className="p-4 text-muted-foreground font-mono">{category.slug}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditModal(category)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(category.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        {ar ? "لا توجد أقسام حالياً." : "No categories found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 md:hidden">
              {categories.map((category) => (
                <article key={category.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">{ar ? "الاسم بالعربي" : "Arabic name"}</p>
                      <p className="mt-1 font-bold text-foreground break-words">{category.name_ar}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{ar ? "الاسم بالإنجليزي" : "English name"}</p>
                      <p className="mt-1 font-bold text-foreground break-words">{category.name_en}</p>
                    </div>
                    <div className="col-span-2 border-t border-border/60 pt-3">
                      <p className="text-xs text-muted-foreground">Slug</p>
                      <p className="mt-1 text-sm text-foreground font-mono break-all">{category.slug}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2 border-t border-border/60 pt-3">
                    <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => openEditModal(category)} aria-label={ar ? "تعديل القسم" : "Edit category"}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => handleDelete(category.id)} aria-label={ar ? "حذف القسم" : "Delete category"}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            </>
          )}
        </div>

        {/* Modal Form */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
            <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-black text-foreground">
                {editingCategory ? (ar ? "تعديل القسم" : "Edit Category") : (ar ? "إضافة قسم جديد" : "Add New Category")}
              </h3>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "الاسم بالعربية" : "Name (Arabic)"}</label>
                <Input required value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="bg-background text-foreground text-sm" placeholder="مثال: عطور نسائية" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "الاسم بالإنجليزية" : "Name (English)"}</label>
                <Input required value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="bg-background text-foreground text-sm" placeholder="e.g. Women's Perfumes" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Slug (URL)</label>
                <Input required value={slug} onChange={(e) => setSlug(e.target.value)} className="bg-background text-foreground text-sm font-mono" placeholder="e.g. women-perfumes" />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {ar ? "كلمة إنجليزية بدون مسافات تستخدم في الرابط" : "English word without spaces used in URL"}
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-primary text-white">
                  {ar ? "حفظ القسم" : "Save Category"}
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

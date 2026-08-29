import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product, Category } from "@/lib/types";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { useWishlistStore } from "@/lib/wishlist-store";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

function AdminProducts() {
  const { language } = useI18n();
  const ar = language === "ar";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [badgeAr, setBadgeAr] = useState("");
  const [badgeEn, setBadgeEn] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isOffer, setIsOffer] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [originalPrice, setOriginalPrice] = useState("");

  const [topNotesAr, setTopNotesAr] = useState("");
  const [topNotesEn, setTopNotesEn] = useState("");
  const [heartNotesAr, setHeartNotesAr] = useState("");
  const [heartNotesEn, setHeartNotesEn] = useState("");
  const [baseNotesAr, setBaseNotesAr] = useState("");
  const [baseNotesEn, setBaseNotesEn] = useState("");

  useEffect(() => {
    fetchProductsAndCategories();
  }, []);

  const fetchProductsAndCategories = async () => {
    setLoading(true);
    try {
      const { data: pData } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      setProducts(pData as Product[] || []);

      const { data: cData } = await supabase
        .from("categories")
        .select("*");
      setCategories(cData as Category[] || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setTitleAr("");
    setTitleEn("");
    setDescAr("");
    setDescEn("");
    setPrice("");
    setUnit("");
    setBadgeAr("");
    setBadgeEn("");
    setStock("");
    setImageUrls([]);
    setCategoryId("");
    setIsFeatured(false);
    setIsOffer(false);
    setIsActive(true);
    setOriginalPrice("");
    setTopNotesAr("");
    setTopNotesEn("");
    setHeartNotesAr("");
    setHeartNotesEn("");
    setBaseNotesAr("");
    setBaseNotesEn("");
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setTitleAr(product.title_ar);
    setTitleEn(product.title_en);
    setDescAr(product.description_ar || "");
    setDescEn(product.description_en || "");
    setPrice(product.price.toString());
    setUnit(product.unit || "");
    setBadgeAr(product.badge_ar || "");
    setBadgeEn(product.badge_en || "");
    setStock(product.stock.toString());
    setImageUrls(product.images || []);
    setCategoryId(product.category_id || "");
    setIsFeatured(product.is_featured || false);
    setIsOffer(product.is_offer || false);
    setIsActive(product.is_active !== false);
    setOriginalPrice(product.original_price ? product.original_price.toString() : "");
    setTopNotesAr(product.top_notes_ar || "");
    setTopNotesEn(product.top_notes_en || "");
    setHeartNotesAr(product.heart_notes_ar || "");
    setHeartNotesEn(product.heart_notes_en || "");
    setBaseNotesAr(product.base_notes_ar || "");
    setBaseNotesEn(product.base_notes_en || "");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleAr.trim() || !titleEn.trim() || !price || !stock) {
      toast.error(ar ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields");
      return;
    }
    
    if (parseFloat(price) < 0) {
      toast.error(ar ? "السعر لا يمكن أن يكون أقل من الصفر" : "Price cannot be less than zero");
      return;
    }
    
    if (parseInt(stock) < 0) {
      toast.error(ar ? "المخزون لا يمكن أن يكون أقل من الصفر" : "Stock cannot be less than zero");
      return;
    }

    const payload = {
      title_ar: titleAr,
      title_en: titleEn,
      description_ar: descAr,
      description_en: descEn,
      price: parseFloat(price),
      original_price: originalPrice ? parseFloat(originalPrice) : null,
      unit: unit.trim() || null,
      badge_ar: badgeAr.trim() || null,
      badge_en: badgeEn.trim() || null,
      stock: parseInt(stock),
      images: imageUrls,
      category_id: categoryId || null,
      is_active: isActive,
      is_featured: isFeatured,
      is_offer: isOffer,
      top_notes_ar: topNotesAr.trim() || null,
      top_notes_en: topNotesEn.trim() || null,
      heart_notes_ar: heartNotesAr.trim() || null,
      heart_notes_en: heartNotesEn.trim() || null,
      base_notes_ar: baseNotesAr.trim() || null,
      base_notes_en: baseNotesEn.trim() || null,
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id);
        if (error) throw error;

        // If product is deactivated, remove it from all users' wishlists
        if (!isActive) {
          await supabase.from("wishlists").delete().eq("product_id", editingProduct.id);
          useCartStore.getState().removeItem(editingProduct.id);
          useWishlistStore.getState().removeFromWishlist(editingProduct.id);
        } else {
          // If product is updated, sync its new data to the local cart instantly
          useCartStore.getState().syncProduct({ ...editingProduct, ...payload } as Product);
        }

        toast.success(ar ? "تم تعديل المنتج بنجاح" : "Product updated successfully");
      } else {
        const { error } = await supabase
          .from("products")
          .insert(payload);
        if (error) throw error;
        toast.success(ar ? "تم إضافة المنتج بنجاح" : "Product added successfully");
      }
      setShowModal(false);
      fetchProductsAndCategories();
    } catch (err: any) {
      toast.error(ar ? "فشل حفظ المنتج" : "Failed to save product", {
        description: err.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(ar ? "هل أنت متأكد من حذف هذا المنتج؟" : "Are you sure you want to delete this product?")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      
      // Instantly remove from local cart and wishlist
      useCartStore.getState().removeItem(id);
      useWishlistStore.getState().removeFromWishlist(id);
      
      toast.success(ar ? "تم حذف المنتج بنجاح" : "Product deleted successfully");
      fetchProductsAndCategories();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleActive = async (product: Product) => {
    const newStatus = !product.is_active;
    try {
      // Optimistic update
      setProducts(products.map(p => p.id === product.id ? { ...p, is_active: newStatus } : p));
      
      const { error } = await supabase.from("products").update({ is_active: newStatus }).eq("id", product.id);
      if (error) throw error;
      
      if (!newStatus) {
        await supabase.from("wishlists").delete().eq("product_id", product.id);
        useCartStore.getState().removeItem(product.id);
        useWishlistStore.getState().removeFromWishlist(product.id);
      }
      
      toast.success(newStatus ? (ar ? "تم تنشيط المنتج" : "Product activated") : (ar ? "تم إخفاء المنتج" : "Product hidden"));
    } catch (error: any) {
      toast.error(error.message);
      fetchProductsAndCategories(); // Revert on failure
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingImage(true);
      if (!e.target.files || e.target.files.length === 0) return;
      
      const newUrls = [...imageUrls];
      
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const fileExt = file.name.split('.').pop();
        const filePath = `${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('products').getPublicUrl(filePath);
        newUrls.push(data.publicUrl);
      }
      
      setImageUrls(newUrls);
      toast.success(ar ? "تم رفع الصور بنجاح" : "Images uploaded successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-black text-foreground">
                {ar ? "إدارة المنتجات" : "Manage Products"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {ar ? "إضافة، تعديل وحذف منتجات المتجر" : "Add, edit and delete store products"}
              </p>
            </div>
            <Button onClick={openAddModal} className="bg-primary text-white flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              {ar ? "إضافة منتج" : "Add Product"}
            </Button>
          </div>

          {loading ? (
            <span className="text-muted-foreground">{ar ? "جاري تحميل المنتجات..." : "Loading products..."}</span>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border text-xs font-bold text-muted-foreground text-start">
                    <th className="p-4 text-start">{ar ? "المنتج" : "Product"}</th>
                    <th className="p-4 text-start">{ar ? "السعر" : "Price"}</th>
                    <th className="p-4 text-start">{ar ? "المخزون" : "Stock"}</th>
                    <th className="p-4 text-start">{ar ? "الحالة" : "Status"}</th>
                    <th className="p-4 text-start">{ar ? "التحكم" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-secondary/10">
                      <td className="p-4 flex items-center gap-3">
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt={product.title_ar} className="h-10 w-10 rounded-lg object-cover bg-secondary" />
                        )}
                        <div>
                          <p className="font-bold text-foreground">
                            {product.is_featured && <span className="text-yellow-400 me-1">⭐</span>}
                            {ar ? product.title_ar : product.title_en}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{ar ? product.description_ar : product.description_en}</p>
                        </div>
                      </td>
                      <td className="p-4 font-black text-primary">
                        {product.price.toFixed(2)} {ar ? "ج.م" : "EGP"}
                      </td>
                      <td className="p-4 font-bold text-foreground">{product.stock}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase ${product.is_active ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                          {product.is_active ? (ar ? "نشط" : "ACTIVE") : (ar ? "مخفي" : "HIDDEN")}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className={`h-8 w-8 ${product.is_active ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => toggleActive(product)}
                            title={ar ? "تغيير حالة المنتج" : "Toggle Status"}
                          >
                            {product.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditModal(product)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(product.id)}>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={() => setShowModal(false)}>
            <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-black text-foreground">
                {editingProduct ? (ar ? "تعديل المنتج" : "Edit Product") : (ar ? "إضافة منتج جديد" : "Add New Product")}
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "العنوان بالعربية" : "Title (Arabic)"}</label>
                  <Input required value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="bg-background text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "العنوان بالإنجليزية" : "Title (English)"}</label>
                  <Input required value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="bg-background text-foreground text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "الوصف بالعربية" : "Description (Arabic)"}</label>
                <textarea rows={3} value={descAr} onChange={(e) => setDescAr(e.target.value)} className="w-full text-sm bg-background text-foreground rounded-md border border-border p-2" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "الوصف بالإنجليزية" : "Description (English)"}</label>
                <textarea rows={3} value={descEn} onChange={(e) => setDescEn(e.target.value)} className="w-full text-sm bg-background text-foreground rounded-md border border-border p-2" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "القسم (المجموعة)" : "Category"}</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full text-sm bg-background text-foreground rounded-md border border-border p-2 h-10"
                  >
                    <option value="">{ar ? "بدون قسم" : "No Category"}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {ar ? cat.name_ar : cat.name_en}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <label htmlFor="isFeatured" className="text-sm font-semibold text-foreground cursor-pointer">
                    {ar ? "⭐ منتج مميز (يظهر في الرئيسية)" : "⭐ Featured (shows on Home)"}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isOffer"
                    checked={isOffer}
                    onChange={(e) => setIsOffer(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <label htmlFor="isOffer" className="text-sm font-semibold text-foreground cursor-pointer">
                    {ar ? "🔥 عرض حصري (يظهر في العروض فقط)" : "🔥 Exclusive offer (offers only)"}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <label htmlFor="isActive" className="text-sm font-semibold text-foreground cursor-pointer">
                    {ar ? "👁️ منتج نشط (يظهر للعملاء)" : "👁️ Active (Visible to customers)"}
                  </label>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "السعر (بعد الخصم)" : "Sale Price"}</label>
                  <Input type="number" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} className="bg-background text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    {ar ? "السعر الأصلي (اختياري للعروض)" : "Original Price (for offers)"}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    className="bg-background text-foreground text-sm"
                    placeholder={ar ? "اتركه فارغ لو مفيش خصم" : "Leave blank if no discount"}
                  />
                  {originalPrice && price && parseFloat(originalPrice) > parseFloat(price) && (
                    <p className="text-[10px] text-green-600 mt-1 font-semibold">
                      🏷️ {Math.round((1 - parseFloat(price) / parseFloat(originalPrice)) * 100)}% {ar ? "خصم" : "OFF"}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "المخزون" : "Stock"}</label>
                <Input type="number" required value={stock} onChange={(e) => setStock(e.target.value)} className="bg-background text-foreground text-sm" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    {ar ? "الوحدة / الحجم" : "Unit / Size"}
                  </label>
                  <Input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="bg-background text-foreground text-sm"
                    placeholder={ar ? "مثال: 30 ml أو 100 جم" : "Example: 30 ml or 100 g"}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    {ar ? "البادج بالعربية" : "Badge (Arabic)"}
                  </label>
                  <Input
                    value={badgeAr}
                    onChange={(e) => setBadgeAr(e.target.value)}
                    className="bg-background text-foreground text-sm"
                    placeholder={ar ? "مثال: إصدار محدود" : "Example: إصدار محدود"}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    {ar ? "البادج بالإنجليزية" : "Badge (English)"}
                  </label>
                  <Input
                    value={badgeEn}
                    onChange={(e) => setBadgeEn(e.target.value)}
                    className="bg-background text-foreground text-sm"
                    placeholder={ar ? "مثال: Limited Edition" : "Example: Limited Edition"}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-bold text-foreground mb-3">{ar ? "الهرم العطري" : "Fragrance Pyramid"}</h4>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "القمة بالعربية" : "Top Notes (Arabic)"}</label>
                      <Input value={topNotesAr} onChange={(e) => setTopNotesAr(e.target.value)} className="bg-background text-foreground text-sm" placeholder={ar ? "مثال: برغموت، ليمون" : "e.g. Bergamot, Lemon"} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "القمة بالإنجليزية" : "Top Notes (English)"}</label>
                      <Input value={topNotesEn} onChange={(e) => setTopNotesEn(e.target.value)} className="bg-background text-foreground text-sm" placeholder={ar ? "مثال: Bergamot, Lemon" : "e.g. Bergamot, Lemon"} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "القلب بالعربية" : "Heart Notes (Arabic)"}</label>
                      <Input value={heartNotesAr} onChange={(e) => setHeartNotesAr(e.target.value)} className="bg-background text-foreground text-sm" placeholder={ar ? "مثال: ياسمين، ورد" : "e.g. Jasmine, Rose"} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "القلب بالإنجليزية" : "Heart Notes (English)"}</label>
                      <Input value={heartNotesEn} onChange={(e) => setHeartNotesEn(e.target.value)} className="bg-background text-foreground text-sm" placeholder={ar ? "مثال: Jasmine, Rose" : "e.g. Jasmine, Rose"} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "القاعدة بالعربية" : "Base Notes (Arabic)"}</label>
                      <Input value={baseNotesAr} onChange={(e) => setBaseNotesAr(e.target.value)} className="bg-background text-foreground text-sm" placeholder={ar ? "مثال: عود، مسك" : "e.g. Oud, Musk"} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "القاعدة بالإنجليزية" : "Base Notes (English)"}</label>
                      <Input value={baseNotesEn} onChange={(e) => setBaseNotesEn(e.target.value)} className="bg-background text-foreground text-sm" placeholder={ar ? "مثال: Oud, Musk" : "e.g. Oud, Musk"} />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">{ar ? "صور المنتج" : "Product Images"}</label>
                <Input type="file" multiple accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} className="bg-background text-foreground text-sm cursor-pointer" />
                {uploadingImage && <p className="text-xs text-muted-foreground mt-1">{ar ? "جاري الرفع..." : "Uploading..."}</p>}
                
                {imageUrls.length > 0 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                    {imageUrls.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden border border-border flex-shrink-0">
                        <img src={url} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setImageUrls(imageUrls.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-primary text-white">
                  {ar ? "حفظ المنتج" : "Save Product"}
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

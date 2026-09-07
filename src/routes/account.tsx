import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { User, Upload, Loader2, Edit2, Check, X, ReceiptText, Printer, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "@tanstack/react-router";
import type { Order, ReturnRequest, OrderItem } from "@/lib/types";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { createNotification } from "@/lib/notifications";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EGYPT_GOVERNORATES, formatGovernorate, findGovernoratePair } from "@/lib/governorates";
import { siteAssets } from "@/lib/site-assets";
import { LocationPickerModal } from "@/components/checkout/LocationPickerModal";

export const Route = createFileRoute("/account")({
  validateSearch: (search: Record<string, unknown>): { orderId?: string; returnId?: string } => {
    const res: { orderId?: string; returnId?: string } = {};
    if (search["orderId"]) res.orderId = search["orderId"] as string;
    if (search["returnId"]) res.returnId = search["returnId"] as string;
    return res;
  },
  component: AccountPage,
});

function AccountPage() {
  const { language } = useI18n();
  const ar = language === "ar";
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const searchParams = Route.useSearch();
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [highlightedReturnId, setHighlightedReturnId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, OrderItem[]>>({});
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  // Invoice Modal State
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  // Return request states
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnAmount, setReturnAmount] = useState<number>(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Partial return: items selected by user
  const [returnSelectedItems, setReturnSelectedItems] = useState<Record<string, number>>({});
  const [returnModalItems, setReturnModalItems] = useState<OrderItem[]>([]);
  const [returnMaxQty, setReturnMaxQty] = useState<Record<string, number>>({}); // max returnable qty per item
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null); // for reopened returns

  // Edit Profile states
  const { refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editGovernorate, setEditGovernorate] = useState("");
  const [editLocationModalOpen, setEditLocationModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const targetOrderId =
      searchParams?.orderId ||
      new URLSearchParams(window.location.search).get("orderId") ||
      window.location.hash.replace("#order-", "");

    const targetReturnId =
      searchParams?.returnId ||
      new URLSearchParams(window.location.search).get("returnId") ||
      window.location.hash.replace("#return-", "");

    if ((!targetOrderId && !targetReturnId) || ordersLoading) return;

    const timer = setTimeout(() => {
      let el: HTMLElement | null = null;
      if (targetReturnId) {
        el =
          document.getElementById(`return-${targetReturnId}`) ||
          (document.querySelector(`[data-return-id="${targetReturnId}"]`) as HTMLElement | null);
      }
      if (!el && targetOrderId) {
        el =
          document.getElementById(`order-${targetOrderId}`) ||
          document.getElementById(`return-${targetOrderId}`) ||
          (document.querySelector(`[data-order-id="${targetOrderId}"]`) as HTMLElement | null);
      }

      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if (targetReturnId) setHighlightedReturnId(targetReturnId);
        if (targetOrderId) setHighlightedOrderId(targetOrderId);

        const highlightTimer = setTimeout(() => {
          setHighlightedOrderId(null);
          setHighlightedReturnId(null);
        }, 4000);
        return () => clearTimeout(highlightTimer);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [ordersLoading, searchParams?.orderId, searchParams?.returnId, orders, returns]);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth/login" });
    } else if (!loading && user && profile) {
      if (
        user.app_metadata?.provider === "google" &&
        (!profile.phone || !profile.governorate || !profile.address)
      ) {
        navigate({ to: "/auth/complete-profile" });
        return;
      }
      fetchOrdersAndReturns();

      // Subscribe to real-time updates for user's orders
      const ordersChannel = supabase
        .channel(`user_orders_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchOrdersAndReturns();
          }
        )
        .subscribe();

      // Subscribe to real-time updates for user's returns
      const returnsChannel = supabase
        .channel(`user_returns_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "returns",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchOrdersAndReturns();
          }
        )
        .subscribe();

      // Subscribe to real-time updates for user's profile (wallet balance)
      const profileChannel = supabase
        .channel(`user_profile_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          () => {
            refreshProfile();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(ordersChannel);
        supabase.removeChannel(returnsChannel);
        supabase.removeChannel(profileChannel);
      };
    }
  }, [user, loading]);

  const fetchOrdersAndReturns = async () => {
    if (!user) return;
    setOrdersLoading(true);
    try {
      const { data: oData, error: oErr } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (oErr) throw oErr;
      const fetchedOrders = oData || [];
      setOrders(fetchedOrders);

      // Fetch items for all orders
      if (fetchedOrders.length > 0) {
        const ids = fetchedOrders.map((o) => o.id);
        const { data: itemsData } = await supabase
          .from("order_items")
          .select("*")
          .in("order_id", ids);
        if (itemsData) {
          const map: Record<string, OrderItem[]> = {};
          (itemsData as OrderItem[]).forEach((item) => {
            if (!map[item.order_id]) map[item.order_id] = [];
            map[item.order_id].push(item);
          });
          setOrderItemsMap(map);
        }
      }

      const { data: rData, error: rErr } = await supabase
        .from("returns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (rErr) throw rErr;
      setReturns(rData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success(ar ? "تم تسجيل الخروج" : "Signed out successfully");
    navigate({ to: "/" });
  };

  const toggleEditMode = () => {
    if (!isEditing && profile) {
      setEditName(profile.name || "");
      setEditPhone(profile.phone || "");
      setEditAddress(profile.address || "");
      setEditGovernorate(profile.governorate || "");
    }
    setIsEditing(!isEditing);
  };

  const saveProfile = async () => {
    if (!user) return;

    if (editPhone.trim()) {
      const phoneRegex = /^01[0-5][0-9]{8}$/;
      if (!phoneRegex.test(editPhone.trim())) {
        toast.error(ar ? "يرجى إدخال رقم هاتف مصري صحيح (01X XXXXXXXX)" : "Please enter a valid Egyptian phone number");
        return;
      }
    } else {
      toast.error(ar ? "الرجاء إدخال رقم الهاتف" : "Please enter a phone number");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: editName,
          phone: editPhone.trim(),
          address: editAddress,
          governorate: editGovernorate,
          phone_verified: true,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success(ar ? "تم تحديث البيانات بنجاح" : "Profile updated successfully");
      await refreshProfile();
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error(ar ? "حدث خطأ أثناء التحديث" : "Error updating profile");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper: calculate remaining returnable qty per item for an order
  const getReturnableQty = (orderId: string): Record<string, number> => {
    const items = orderItemsMap[orderId] || [];
    const result: Record<string, number> = {};
    items.forEach(item => { result[item.id] = item.quantity; });
    // Subtract quantities from completed returns only
    const completedReturns = returns.filter(r => r.order_id === orderId && r.status === "completed");
    completedReturns.forEach(ret => {
      const returnedItems = ret.received_items || ret.returned_items || [];
      returnedItems.forEach(ri => {
        // match by item_id (stored in returned_items) vs item.id
        const matchedItem = items.find(i => i.id === ri.item_id);
        if (matchedItem) {
          result[matchedItem.id] = (result[matchedItem.id] || 0) - ri.quantity;
        }
      });
    });
    return result;
  };

  // Helper: check if order has an active (non-completed, non-rejected) return
  const hasActiveReturn = (orderId: string) =>
    returns.some(r => r.order_id === orderId && ["pending", "approved", "received", "reopened"].includes(r.status));

  // Helper: check if order has a rejected return
  const hasRejectedReturn = (orderId: string) =>
    returns.some(r => r.order_id === orderId && r.status === "rejected");

  // Helper: check if within 7-day return window
  const withinReturnWindow = (order: Order) => {
    if (!order.delivered_at) return false;
    const deliveredAt = new Date(order.delivered_at);
    const now = new Date();
    const diffDays = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  };

  // Helper: check if any items still returnable
  const hasReturnableItems = (orderId: string) => {
    const qty = getReturnableQty(orderId);
    return Object.values(qty).some(q => q > 0);
  };

  const openReturnModal = (order: Order) => {
    setSelectedOrderId(order.id);
    setReturnReason("");
    setEditingReturnId(null);
    const items = orderItemsMap[order.id] || [];
    setReturnModalItems(items);
    // Only allow returning what's left
    const returnableQty = getReturnableQty(order.id);
    // Start with 0 selected — user picks what to return
    const defaultSelected: Record<string, number> = {};
    items.forEach(item => {
      defaultSelected[item.id] = 0;
    });
    setReturnSelectedItems(defaultSelected);
    setReturnMaxQty(returnableQty);
    setReturnAmount(0);
    setShowReturnModal(true);
  };

  const openReopenedReturnModal = (ret: ReturnRequest) => {
    setSelectedOrderId(ret.order_id);
    setReturnReason(ret.reason);
    setEditingReturnId(ret.id);
    const items = orderItemsMap[ret.order_id] || [];
    setReturnModalItems(items);
    // returnableQty = original qty minus completed returns = the actual max returnable
    const returnableQty = getReturnableQty(ret.order_id);
    setReturnMaxQty(returnableQty);
    // Pre-fill with current return items (but capped at max)
    const currentItems = ret.returned_items || [];
    const defaultSelected: Record<string, number> = {};
    items.forEach(item => { defaultSelected[item.id] = 0; });
    currentItems.forEach(ri => {
      const matchedItem = items.find(i => i.id === ri.item_id);
      if (matchedItem) {
        // Cap at the actual remaining qty
        defaultSelected[matchedItem.id] = Math.min(ri.quantity, returnableQty[matchedItem.id] || 0);
      }
    });
    setReturnSelectedItems(defaultSelected);
    const total = items.reduce((sum, item) => sum + item.price * (defaultSelected[item.id] || 0), 0);
    setReturnAmount(total);
    setShowReturnModal(true);
  };

  const cancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      const { error, data: orderData } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .eq("user_id", user!.id)
        .select()
        .single();
      if (error) throw error;

      // Notify the user
      await createNotification({
        user_id: user!.id,
        type: "order_update",
        title_ar: "تم إلغاء الطلب",
        title_en: "Order Cancelled",
        body_ar: "تم إلغاء طلبك بنجاح.",
        body_en: "Your order has been cancelled successfully.",
        link: `/account?orderId=${orderId}`,
      });

      // Get customer name from the order
      const customerName = orders.find((o) => o.id === orderId)?.customer_name || profile?.name || "عميل";

      // Notify the admin
      await createNotification({
        user_id: "admin",
        type: "order_update",
        title_ar: "إلغاء طلب",
        title_en: "Order Cancelled",
        body_ar: `قام ${customerName} بإلغاء طلبه.`,
        body_en: `${customerName} cancelled their order.`,
        link: `/admin/orders?orderId=${orderId}`,
      });

      toast.success(ar ? "تم إلغاء الطلب بنجاح" : "Order cancelled successfully");
      setConfirmCancelId(null);
      fetchOrdersAndReturns();
    } catch (err: any) {
      toast.error(ar ? "فشل إلغاء الطلب" : "Failed to cancel order", { description: err.message });
    } finally {
      setCancellingId(null);
    }
  };

  const canCancel = (status: Order["status"]) =>
    status === "pending";

  const [returnImageFiles, setReturnImageFiles] = useState<File[]>([]);
  const [uploadingReturnImage, setUploadingReturnImage] = useState(false);

  const submitReturnRequest = async () => {
    if (!user || !selectedOrderId || !returnReason.trim()) return;

    try {
      setUploadingReturnImage(true);
      const imageUrls: string[] = [];

      for (const file of returnImageFiles) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("returns")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("returns")
          .getPublicUrl(filePath);

        imageUrls.push(publicUrlData.publicUrl);
      }

      const returnPayload: any = {
        reason: returnReason,
        status: "pending",
        refund_amount: returnAmount,
        returned_items: Object.entries(returnSelectedItems)
          .filter(([, qty]) => qty > 0)
          .map(([itemId, qty]) => ({
            item_id: itemId,
            quantity: qty,
            title: returnModalItems.find(i => i.id === itemId)?.title || "",
            price: returnModalItems.find(i => i.id === itemId)?.price || 0,
          })),
      };

      if (imageUrls.length > 0) {
        returnPayload.images = imageUrls;
      }

      if (editingReturnId) {
        // Clear rejection reason since it's being resubmitted
        returnPayload.rejection_reason = null;
        returnPayload.rejected_at = null;
        const { error } = await supabase.from("returns").update(returnPayload).eq("id", editingReturnId);
        if (error) throw error;
      } else {
        returnPayload.order_id = selectedOrderId;
        returnPayload.user_id = user.id;
        const { error } = await supabase.from("returns").insert(returnPayload);
        if (error) throw error;
      }

      // Notify the admin — link to returns tab directly
      const customerName = profile?.name || "عميل";
      await createNotification({
        user_id: "admin",
        type: "return_request",
        title_ar: editingReturnId ? "تعديل طلب استرجاع" : "طلب استرجاع جديد",
        title_en: editingReturnId ? "Return Request Updated" : "New Return Request",
        body_ar: editingReturnId ? `قام ${customerName} بتعديل طلب الاسترجاع الخاص به.` : `قام ${customerName} بطلب استرجاع لطلبه.`,
        body_en: editingReturnId ? `${customerName} updated their return request.` : `${customerName} requested a return for their order.`,
        link: `/admin/orders?tab=returns&orderId=${selectedOrderId}`,
      });

      // Notify the user
      await createNotification({
        user_id: user.id,
        type: "return_request",
        title_ar: editingReturnId ? "تم تحديث طلب الاسترجاع" : "تم استلام طلب الاسترجاع",
        title_en: editingReturnId ? "Return Request Updated" : "Return Request Received",
        body_ar: editingReturnId ? "تم تحديث وإعادة إرسال طلبك بنجاح." : "تم استلام طلب الاسترجاع الخاص بك بنجاح وسيتم مراجعته في أقرب وقت.",
        body_en: editingReturnId ? "Your return request has been updated and resubmitted successfully." : "Your return request has been received and will be reviewed shortly.",
        link: `/account?orderId=${selectedOrderId}`,
      });

      toast.success(
        ar
          ? "تم تقديم طلب الاسترجاع بنجاح. سنقوم بمراجعته."
          : "Return request submitted successfully. We will review it."
      );
      setShowReturnModal(false);
      setReturnImageFiles([]);
      setEditingReturnId(null);
      fetchOrdersAndReturns();
    } catch (err: any) {
      toast.error(ar ? "فشل تقديم طلب الاسترجاع" : "Failed to submit return request", {
        description: err.message,
      });
    } finally {
      setUploadingReturnImage(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      if (!event.target.files || event.target.files.length === 0 || !user) {
        throw new Error(ar ? "يجب اختيار صورة" : "You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success(ar ? "تم تحديث الصورة بنجاح" : "Avatar updated successfully");
      await refreshProfile();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-muted-foreground">{ar ? "جاري التحميل..." : "Loading account..."}</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <StoreLayout>
        <main className="mx-auto max-w-md px-4 pt-28 pb-16 text-center">
          <h2 className="text-xl font-bold mb-4">{ar ? "تعذر تحميل بيانات الحساب" : "Unable to load profile"}</h2>
          <Button onClick={() => window.location.reload()} className="bg-primary text-primary-foreground">
            {ar ? "إعادة التحديث" : "Refresh Page"}
          </Button>
        </main>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <main className="mx-auto max-w-4xl px-4 pt-28 pb-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Sidebar */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm h-fit">
            <div className="flex flex-col items-center mb-6 relative">
              <div
                className="w-24 h-24 rounded-full bg-secondary border-2 border-border/50 overflow-hidden flex items-center justify-center mb-3 group cursor-pointer relative"
                onClick={() => fileInputRef.current?.click()}
              >
                <Avatar className="w-full h-full">
                  <AvatarImage src={profile.avatar_url || ""} alt="Profile" className="object-cover" />
                  <AvatarFallback className="bg-transparent">
                    <User className="w-10 h-10 text-muted-foreground" strokeWidth={1} />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingAvatar ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Upload className="w-6 h-6 text-white" />}
                </div>
              </div>
              <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={uploadAvatar} disabled={uploadingAvatar} />
              <h2 className="text-xl font-black text-foreground text-center">
                {profile.name || (ar ? "مستخدم" : "User")}
              </h2>
            </div>

            <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
              <h3 className="font-bold text-foreground">{ar ? "بيانات الحساب" : "Account Details"}</h3>
              {isEditing ? (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100/50" onClick={saveProfile} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100/50" onClick={toggleEditMode} disabled={isSaving}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={toggleEditMode}>
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="space-y-3 text-sm text-foreground/80">
              <div>
                <span className="font-bold block text-muted-foreground mb-1">{ar ? "الاسم" : "Name"}</span>
                {isEditing ? (
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm" />
                ) : (
                  <span>{profile.name || (ar ? "غير محدد" : "Not specified")}</span>
                )}
              </div>
              <div>
                <span className="font-bold block text-muted-foreground mb-1">{ar ? "البريد الإلكتروني" : "Email"}</span>
                <span className="text-muted-foreground">{profile.email}</span>
              </div>
              <div>
                <span className="font-bold block text-muted-foreground mb-1">{ar ? "الهاتف" : "Phone"}</span>
                {isEditing ? (
                  <Input
                    value={editPhone}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      val = val.slice(0, 11);
                      setEditPhone(val);
                    }}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      const phoneRegex = /^01[0-5][0-9]{8}$/;

                      if (val && !phoneRegex.test(val)) {
                        toast.error(ar ? "رقم مصري غير صحيح (01X XXXXXXXX)" : "Invalid Egyptian phone (01X XXXXXXXX)");
                        setEditPhone("");
                        return;
                      }
                    }}
                    maxLength={11}
                    pattern="01[0-5][0-9]{8}"
                    inputMode="numeric"
                    title="رقم مصري (01[0-5] رلم 8 أرقام)"
                    className="h-8 text-sm"
                    dir="ltr"
                  />
                ) : (
                  <span dir="ltr" className="inline-block">{profile.phone || (ar ? "غير محدد" : "Not specified")}</span>
                )}
              </div>
              <div>
                <span className="font-bold block text-muted-foreground mb-1">{ar ? "المحافظة" : "Governorate"}</span>
                {isEditing ? (
                  <select
                    value={findGovernoratePair(editGovernorate)?.ar || editGovernorate}
                    onChange={(e) => setEditGovernorate(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background text-foreground text-sm px-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    style={{ direction: ar ? "rtl" : "ltr" }}
                  >
                    <option value="">
                      {ar ? "اختر المحافظة..." : "Select governorate..."}
                    </option>
                    {EGYPT_GOVERNORATES.map((gov) => (
                      <option key={gov.ar} value={gov.ar}>
                        {ar ? gov.ar : gov.en}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{formatGovernorate(profile.governorate, ar)}</span>
                )}
              </div>
              <div>
                <span className="font-bold block text-muted-foreground mb-1">{ar ? "العنوان" : "Address"}</span>
                {isEditing ? (
                  <div className="space-y-1.5">
                    <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="h-8 text-sm" placeholder={ar ? "العنوان" : "Address"} />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditLocationModalOpen(true)}
                      className="w-full text-xs py-1.5 h-auto flex items-center justify-center gap-1.5 border-dashed border-primary/40 text-primary hover:bg-primary/10 transition-colors font-semibold"
                    >
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>📍 {ar ? "تحديد موقعي التلقائي على الخريطة" : "Select location on map"}</span>
                    </Button>
                  </div>
                ) : (
                  <span>{profile.address || (ar ? "غير محدد" : "Not specified")}</span>
                )}
              </div>
              <div className="pt-2 border-t border-border mt-4">
                <span className="font-bold block text-muted-foreground">{ar ? "رصيد المحفظة" : "Wallet Balance"}</span>
                <span className="text-xl font-black text-primary">
                  {profile.balance.toFixed(2)} {ar ? "ج.م" : "EGP"}
                </span>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              {profile.is_admin && (
                <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/admin" })}>
                  {ar ? "لوحة الإدارة" : "Admin Panel"}
                </Button>
              )}
              <Button variant="destructive" className="w-full" onClick={handleSignOut}>
                {ar ? "تسجيل الخروج" : "Logout"}
              </Button>
            </div>
          </div>

          {/* Main Area */}
          <div className="md:col-span-2 space-y-8">
            {/* Orders Section */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-xl font-black text-foreground mb-4">
                {ar ? "طلباتك" : "Your Orders"}
              </h2>
              {ordersLoading ? (
                <span className="text-muted-foreground">{ar ? "جاري تحميل الطلبات..." : "Loading orders..."}</span>
              ) : orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">{ar ? "ليس لديك أي طلبات سابقة." : "No orders found."}</p>
              ) : (
                <div className="divide-y divide-border">
                  {orders.map((order) => {
                    const items = orderItemsMap[order.id] || [];
                    return (
                      <div
                        key={order.id}
                        id={`order-${order.id}`}
                        data-order-id={order.id}
                        className={`py-5 first:pt-0 last:pb-0 flex flex-col gap-3 rounded-xl p-3 transition-all duration-500 ${highlightedOrderId === order.id
                            ? "bg-primary/10 ring-2 ring-primary border border-primary shadow-lg"
                            : ""
                          }`}
                      >
                        {/* Top row: date + status */}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString(ar ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                          </p>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${order.status === "delivered" ? "bg-green-100 text-green-700" :
                              order.status === "cancelled" ? "bg-red-100 text-red-700" :
                                order.status === "shipped" ? "bg-blue-100 text-blue-700" :
                                  order.status === "returned" ? "bg-orange-100 text-orange-700" :
                                    "bg-yellow-100 text-yellow-700"
                            }`}>
                            {{
                              pending: ar ? "قيد الانتظار" : "Pending",
                              processing: ar ? "جاري المعالجة" : "Processing",
                              shipped: ar ? "تم الشحن" : "Shipped",
                              delivered: ar ? "تم التوصيل" : "Delivered",
                              returned: ar ? "مُرتجع" : "Returned",
                              cancelled: ar ? "ملغي" : "Cancelled",
                            }[order.status] ?? order.status}
                          </span>
                        </div>

                        {/* Products list */}
                        {(() => {
                          const returnableQty = getReturnableQty(order.id);
                          let newSubtotal = 0;

                          return (
                            <>
                              {items.length > 0 && (
                                <ul className="space-y-1">
                                  {items.map((item) => {
                                    const remaining = returnableQty[item.id] ?? item.quantity;
                                    const returned = item.quantity - remaining;
                                    newSubtotal += item.price * remaining;

                                    return (
                                      <li key={item.id} className="flex justify-between text-sm">
                                        <div className="flex flex-col">
                                          <span className="text-foreground">
                                            {item.title}
                                            <span className="text-muted-foreground text-xs"> × {item.quantity}</span>
                                          </span>
                                          {returned > 0 && (
                                            <span className="text-[11px] font-semibold text-orange-600">
                                              {ar ? `(تم استرجاع ${returned}، المتبقي ${remaining})` : `(Returned ${returned}, Remaining ${remaining})`}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-muted-foreground text-xs self-start mt-0.5">
                                          {(item.price * remaining).toFixed(2)} {ar ? "ج.م" : "EGP"}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}

                              {/* Totals row */}
                              <div className="flex flex-col gap-1 text-xs text-muted-foreground border-t border-border pt-2 mt-1">
                                <div className="flex justify-between">
                                  <span>{ar ? "المجموع الفرعي:" : "Subtotal:"}</span>
                                  <span>{newSubtotal.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>{ar ? "مصاريف الشحن:" : "Shipping:"}</span>
                                  <span>{order.shipping_cost.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                                </div>
                                {order.discount > 0 && (
                                  <div className="flex justify-between text-green-600">
                                    <span>{ar ? "خصم:" : "Discount:"}</span>
                                    <span>- {order.discount.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                                  </div>
                                )}
                                {order.wallet_used > 0 && (
                                  <div className="flex justify-between text-blue-600 font-bold">
                                    <span>{ar ? "مدفوع من المحفظة:" : "Paid from Wallet:"}</span>
                                    <span>- {order.wallet_used.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-black text-foreground text-sm border-t border-border/60 pt-1 mt-1">
                                  <span>{ar ? "المطلوب دفعه:" : "Amount Due:"}</span>
                                  <span>{Math.max(0, newSubtotal + order.shipping_cost - order.discount - (order.wallet_used || 0)).toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                                </div>
                              </div>
                            </>
                          );
                        })()}

                        {(order.status === "delivered" || order.status === "returned") && (
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
                            <span className="font-semibold text-foreground">
                              {ar ? "الاسترجاع" : "Returns"}
                            </span>
                            <span>
                              {hasRejectedReturn(order.id) ? (
                                <span className="text-red-500 font-bold text-xs">{ar ? "تم الرفض (تواصل مع الدعم)" : "Rejected (Contact Support)"}</span>
                              ) : hasActiveReturn(order.id) ? (
                                <span className="text-orange-600 font-bold text-xs">{ar ? "يوجد طلب نشط" : "Active return exists"}</span>
                              ) : !withinReturnWindow(order) ? (
                                <span className="text-muted-foreground text-xs">{ar ? "انتهت فترة الاسترجاع المسموحة" : "Return window has expired"}</span>
                              ) : !hasReturnableItems(order.id) ? (
                                <span className="text-muted-foreground text-xs">{ar ? "تم استرجاع الكمية" : "Items returned"}</span>
                              ) : (
                                <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => openReturnModal(order)}>
                                  {ar ? "طلب استرجاع" : "Request Return"}
                                </Button>
                              )}
                            </span>
                          </div>
                        )}
                        {/* Actions */}
                        <div className="flex gap-2 justify-end items-center pt-2 border-t border-border mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 flex items-center gap-1.5"
                            onClick={() => {
                              setSelectedInvoiceOrder(order);
                              setInvoiceModalOpen(true);
                            }}
                          >
                            <ReceiptText className="w-3.5 h-3.5" />
                            {ar ? "الفاتورة" : "Invoice"}
                          </Button>
                          {canCancel(order.status) && confirmCancelId !== order.id && (
                            <Button size="sm" variant="ghost" className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirmCancelId(order.id)}>
                              {ar ? "إلغاء الطلب" : "Cancel Order"}
                            </Button>
                          )}
                          {confirmCancelId === order.id && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground mr-2">{ar ? "هل أنت متأكد؟" : "Are you sure?"}</span>
                              <Button size="sm" variant="destructive" className="text-xs h-7" disabled={cancellingId === order.id} onClick={() => cancelOrder(order.id)}>
                                {cancellingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (ar ? "نعم" : "Yes")}
                              </Button>
                              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setConfirmCancelId(null)}>
                                {ar ? "لا" : "No"}
                              </Button>
                            </div>
                          )}
                          {(order.status === "processing" || order.status === "shipped") && (
                            <p className="text-xs text-muted-foreground self-center">
                              {ar ? "لإلغاء الطلب تواصل مع الدعم عبر الشات" : "To cancel, contact support via chat"}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Returns Section */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-xl font-black text-foreground mb-4">
                {ar ? "طلبات الاسترجاع" : "Return Requests"}
              </h2>
              {ordersLoading ? (
                <span className="text-muted-foreground">{ar ? "جاري تحميل الطلبات..." : "Loading..."}</span>
              ) : returns.length === 0 ? (
                <p className="text-sm text-muted-foreground">{ar ? "لا توجد طلبات استرجاع." : "No return requests."}</p>
              ) : (
                <div className="divide-y divide-border">
                  {returns.map((ret) => {
                    const items = orderItemsMap[ret.order_id] || [];
                    return (
                      <div
                        key={ret.id}
                        id={`return-${ret.id}`}
                        data-return-id={ret.id}
                        data-order-id={ret.order_id}
                        className={`py-5 first:pt-0 last:pb-0 flex flex-col gap-3 rounded-xl p-3 transition-all duration-500 ${highlightedReturnId === ret.id || highlightedOrderId === ret.order_id
                            ? "bg-primary/10 ring-2 ring-primary border border-primary shadow-lg"
                            : ""
                          }`}
                      >
                        {/* Top row: date + status */}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {new Date(ret.created_at).toLocaleDateString(ar ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                          </p>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${ret.status === "completed" ? "bg-green-100 text-green-700" :
                              ret.status === "approved" ? "bg-orange-100 text-orange-700" :
                                ret.status === "received" ? "bg-blue-100 text-blue-700" :
                                  ret.status === "rejected" ? "bg-red-100 text-red-700" :
                                    "bg-yellow-100 text-yellow-700"
                            }`}>
                            {{
                              pending: ar ? "قيد المراجعة" : "Pending",
                              approved: ar ? "تمت الموافقة" : "Approved",
                              received: ar ? "تم الاستلام" : "Received",
                              completed: ar ? "مكتمل" : "Completed",
                              rejected: ar ? "مرفوض" : "Rejected",
                              reopened: ar ? "تم إعادة الفتح للتعديل" : "Reopened (Needs Edit)",
                              cancelled: ar ? "ملغى" : "Cancelled",
                            }[ret.status] ?? ret.status}
                          </span>
                        </div>

                        {/* Products list */}
                        {(() => {
                          const displayItems = (ret.status === "received" || ret.status === "completed")
                            ? (ret.received_items || ret.returned_items || items)
                            : (ret.returned_items || items);

                          const filteredItems = displayItems.filter((item: any) => item.quantity > 0);

                          if (filteredItems.length === 0) return null;

                          return (
                            <ul className="space-y-1">
                              {filteredItems.map((item: any) => (
                                <li key={item.id || item.item_id} className="flex justify-between text-sm">
                                  <span className="text-foreground">
                                    {item.title}
                                    <span className="text-muted-foreground text-xs"> × {item.quantity}</span>
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    {(item.price * item.quantity).toFixed(2)} {ar ? "ج.م" : "EGP"}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          );
                        })()}

                        {/* Reason + refund */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold">{ar ? "السبب: " : "Reason: "}</span>
                              {ret.reason}
                            </p>
                            {ret.status === "completed" ? (
                              <p className="text-sm font-black text-primary">
                                +{ret.refund_amount.toFixed(2)} {ar ? "ج.م" : "EGP"}
                              </p>
                            ) : (
                              <p className="text-sm font-bold text-muted-foreground">
                                {ret.refund_amount.toFixed(2)} {ar ? "ج.م" : "EGP"}
                              </p>
                            )}
                          </div>

                          {ret.status === "rejected" && ret.rejection_reason && (
                            <div className="bg-red-50 p-2.5 rounded-md mt-1 border border-red-100">
                              <p className="text-xs text-red-700">
                                <span className="font-semibold">{ar ? "سبب الرفض: " : "Rejection Reason: "}</span>
                                {ret.rejection_reason}
                              </p>
                            </div>
                          )}

                          {ret.status === "reopened" && (
                            <div className="flex justify-end mt-2">
                              <Button size="sm" onClick={() => openReopenedReturnModal(ret)} className="text-xs">
                                {ar ? "تعديل وإعادة إرسال" : "Edit & Resubmit"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Return Request Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-foreground">
              {ar ? "طلب استرجاع للمنتج" : "Request Return & Refund"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {ar
                ? "عند الموافقة على طلب الاسترجاع، سيتم شحن رصيد المحفظة الخاص بك بالقيمة المستردة تلقائياً."
                : "Upon approval, the refund amount will be credited to your wallet balance."}
            </p>
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-2">
                {ar ? "المنتجات المراد استرجاعها" : "Items to Return"}
              </label>
              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-2">
                {returnModalItems.filter(item => (returnMaxQty[item.id] || 0) > 0).map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-secondary/20 p-2 rounded-md border border-border">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-foreground">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.price} {ar ? "ج.م" : "EGP"} &bull; {ar ? `متبقي: ${returnMaxQty[item.id] || 0}` : `Remaining: ${returnMaxQty[item.id] || 0}`}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setReturnSelectedItems(prev => {
                            const newQty = Math.max(0, (prev[item.id] || 0) - 1);
                            const updated = { ...prev, [item.id]: newQty };
                            let total = 0;
                            returnModalItems.forEach(i => {
                              total += i.price * (updated[i.id] || 0);
                            });
                            setReturnAmount(total);
                            return updated;
                          });
                        }}
                      >
                        -
                      </Button>
                      <span className="text-sm font-bold min-w-8 text-center">
                        {returnSelectedItems[item.id] || 0} / {returnMaxQty[item.id] || 0}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setReturnSelectedItems(prev => {
                            const maxAllowed = returnMaxQty[item.id] || 0;
                            const newQty = Math.min(maxAllowed, (prev[item.id] || 0) + 1);
                            const updated = { ...prev, [item.id]: newQty };
                            let total = 0;
                            returnModalItems.forEach(i => {
                              total += i.price * (updated[i.id] || 0);
                            });
                            setReturnAmount(total);
                            return updated;
                          });
                        }}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center bg-primary/10 p-3 rounded-md border border-primary/20 mb-4">
                <span className="font-bold text-foreground">{ar ? "المبلغ المسترد المتوقع:" : "Expected Refund:"}</span>
                <span className="font-black text-primary">{returnAmount.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
              </div>

              <label className="block text-sm font-semibold text-muted-foreground mb-1">
                {ar ? "سبب الاسترجاع" : "Reason for Return"}
              </label>
              <textarea
                required
                rows={3}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder={ar ? "يرجى كتابة سبب تفصيلي..." : "Please write a reason..."}
                className="w-full rounded-md border border-border bg-background p-2.5 text-foreground text-sm mb-4"
              />

              <label className="block text-sm font-semibold text-muted-foreground mb-1">
                {ar ? "صور المنتج (بحد أقصى 3 صور)" : "Product Images (Max 3)"}
              </label>
              <div className="flex flex-col gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 3) {
                      toast.error(ar ? "يمكنك رفع 3 صور كحد أقصى" : "You can upload a maximum of 3 images");
                      setReturnImageFiles(files.slice(0, 3));
                    } else {
                      setReturnImageFiles(files);
                    }
                  }}
                  className="w-full text-sm bg-background cursor-pointer file:cursor-pointer file:border-0 file:bg-primary file:text-white file:rounded-md file:px-3 file:py-1 file:mr-2 file:text-xs"
                />
                {returnImageFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {returnImageFiles.map((file, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
                        <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-primary text-white"
                onClick={submitReturnRequest}
                disabled={uploadingReturnImage || returnImageFiles.length === 0 || !returnReason.trim() || returnAmount <= 0}
              >
                {uploadingReturnImage ? <Loader2 className="w-4 h-4 animate-spin" /> : (ar ? "إرسال الطلب" : "Submit Request")}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => { setShowReturnModal(false); setReturnImageFiles([]); }}>
                {ar ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Invoice Modal */}
      <Dialog open={invoiceModalOpen} onOpenChange={setInvoiceModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="print:hidden">
            <DialogTitle>{ar ? "تفاصيل الفاتورة" : "Invoice Details"}</DialogTitle>
          </DialogHeader>
          {selectedInvoiceOrder && (
            <div className="p-6 bg-white text-black" id="invoice-content">
              <div className="flex justify-between items-start mb-8 border-b border-gray-200 pb-6">
                <div>
                  <h3 className="font-bold mb-1 text-gray-900">{ar ? "بيانات العميل" : "Customer Details"}</h3>
                  <p className="text-sm text-gray-800">{selectedInvoiceOrder.customer_name}</p>
                  <p className="text-sm text-gray-800">{selectedInvoiceOrder.phone}</p>
                  <p className="text-sm text-gray-800">{selectedInvoiceOrder.address}, {selectedInvoiceOrder.governorate}</p>
                  {selectedInvoiceOrder.latitude && selectedInvoiceOrder.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${selectedInvoiceOrder.latitude},${selectedInvoiceOrder.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1.5 underline hover:text-blue-800 break-all dir-ltr"
                    >
                      <span>📍</span>
                      <span className="font-mono">{`https://maps.google.com/?q=${selectedInvoiceOrder.latitude},${selectedInvoiceOrder.longitude}`}</span>
                    </a>
                  )}
                </div>
                <div className="text-end flex flex-col items-end">
                  <div className="flex items-center gap-2 mb-2">
                    <img src={siteAssets.logo} alt="Perfume Note" className="h-12 w-12 rounded-full object-cover border border-gray-200" />
                    <span className="text-2xl font-bold font-serif text-[#8c6d46]">Perfume Note</span>
                  </div>
                  <p className="text-sm text-gray-600 font-semibold">{ar ? "رقم الطلب:" : "Order #"} <span className="font-bold text-gray-900">{selectedInvoiceOrder.id.slice(0, 8).toUpperCase()}</span></p>
                  <p className="text-xs text-gray-500 mt-0.5">{new Date(selectedInvoiceOrder.created_at).toLocaleString(ar ? "ar-EG" : "en-US")}</p>
                </div>
              </div>

              <table className="w-full text-start mb-8 border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="py-2.5 text-start font-bold">{ar ? "المنتج" : "Item"}</th>
                    <th className="py-2.5 text-center font-bold">{ar ? "الكمية" : "Qty"}</th>
                    <th className="py-2.5 text-end font-bold">{ar ? "السعر" : "Price"}</th>
                    <th className="py-2.5 text-end font-bold">{ar ? "الإجمالي" : "Total"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orderItemsMap[selectedInvoiceOrder.id]?.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 text-sm">{item.title}</td>
                      <td className="py-3 text-sm text-center font-medium">{item.quantity}</td>
                      <td className="py-3 text-sm text-end">{item.price.toFixed(2)} {ar ? "ج.م" : "EGP"}</td>
                      <td className="py-3 text-sm text-end font-bold">{(item.price * item.quantity).toFixed(2)} {ar ? "ج.م" : "EGP"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-72 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{ar ? "المجموع الفرعي:" : "Subtotal:"}</span>
                    <span className="font-semibold">{(selectedInvoiceOrder.subtotal || (selectedInvoiceOrder.total - selectedInvoiceOrder.shipping_cost + selectedInvoiceOrder.discount + (selectedInvoiceOrder.wallet_used || 0))).toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{ar ? "مصاريف الشحن:" : "Shipping:"}</span>
                    <span className="font-semibold">{selectedInvoiceOrder.shipping_cost.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                  </div>
                  {selectedInvoiceOrder.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>{ar ? "خصم:" : "Discount:"}</span>
                      <span className="font-semibold">- {selectedInvoiceOrder.discount.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                    </div>
                  )}
                  {selectedInvoiceOrder.wallet_used > 0 && (
                    <div className="flex justify-between text-blue-600 font-bold">
                      <span>{ar ? "مدفوع من المحفظة:" : "Wallet Applied:"}</span>
                      <span>- {selectedInvoiceOrder.wallet_used.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t-2 border-gray-900 pt-2 font-black text-lg text-gray-900">
                    <span>{ar ? "المطلوب دفعه:" : "Amount Due:"}</span>
                    <span>{selectedInvoiceOrder.total.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 pt-1">
                    <span>{ar ? "طريقة الدفع:" : "Payment Method:"}</span>
                    <span className="uppercase font-semibold text-gray-700">{selectedInvoiceOrder.payment_method}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setInvoiceModalOpen(false)}>
              {ar ? "إغلاق" : "Close"}
            </Button>
            <Button
              className="bg-[#8c6d46] hover:bg-[#735938] text-white font-bold"
              onClick={() => {
                if (!selectedInvoiceOrder) return;
                const items = orderItemsMap[selectedInvoiceOrder.id] || [];
                const printWindow = window.open("", "_blank");
                if (!printWindow) return;

                const subtotalVal = (selectedInvoiceOrder.subtotal || (selectedInvoiceOrder.total - selectedInvoiceOrder.shipping_cost + selectedInvoiceOrder.discount + (selectedInvoiceOrder.wallet_used || 0))).toFixed(2);

                const itemsRows = items.map(item => `
                  <tr>
                    <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600;">${item.title}</td>
                    <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 13px;">${item.quantity}</td>
                    <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; text-align: left; font-size: 13px;">${item.price.toFixed(2)} ${ar ? 'ج.م' : 'EGP'}</td>
                    <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; text-align: left; font-size: 13px; font-weight: 700;">${(item.price * item.quantity).toFixed(2)} ${ar ? 'ج.م' : 'EGP'}</td>
                  </tr>
                `).join('');

                const mapLocationHtml = selectedInvoiceOrder.latitude && selectedInvoiceOrder.longitude
                  ? `<a href="https://www.google.com/maps?q=${selectedInvoiceOrder.latitude},${selectedInvoiceOrder.longitude}" target="_blank" style="display:inline-flex; align-items:center; gap:4px; margin-top:6px; font-size:11px; color:#2563eb; direction:ltr; font-family:monospace; text-decoration:underline; word-break:break-all;">📍 https://maps.google.com/?q=${selectedInvoiceOrder.latitude},${selectedInvoiceOrder.longitude}</a>`
                  : '';

                const logoSrc = window.location.origin + siteAssets.logo;

                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html dir="${ar ? 'rtl' : 'ltr'}" lang="${ar ? 'ar' : 'en'}">
                    <head>
                      <meta charset="utf-8" />
                      <title>${ar ? 'فاتورة طلب' : 'Order Invoice'} #${selectedInvoiceOrder.id.slice(0, 8).toUpperCase()}</title>
                      <style>
                        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
                        @page { size: A4; margin: 0; }
                        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        html, body { height: auto !important; overflow: visible !important; }
                        body { font-family: 'Cairo', system-ui, -apple-system, sans-serif; background: #ffffff; color: #1a1a1a; padding: 14mm 12mm; font-size: 13px; line-height: 1.4; }
                        .invoice-card { max-width: 750px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px; background: #ffffff; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #8c6d46; margin-bottom: 20px; }
                        .brand { display: flex; items-center; gap: 10px; }
                        .brand-logo { height: 48px; width: 48px; border-radius: 50%; object-fit: cover; border: 1px solid #e2e8f0; }
                        .brand-name { font-size: 22px; font-weight: 800; color: #8c6d46; font-family: Georgia, serif; }
                        .order-info { text-align: ${ar ? 'left' : 'right'}; }
                        .order-id { font-size: 14px; font-weight: 800; color: #0f172a; }
                        .order-date { font-size: 12px; color: #64748b; margin-top: 4px; }
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
                        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
                        .info-title { font-size: 12px; font-weight: 700; color: #8c6d46; margin-bottom: 6px; }
                        .info-text { font-size: 13px; color: #334155; font-weight: 600; line-height: 1.5; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
                        th { background: #f8fafc; color: #475569; font-weight: 700; font-size: 12px; padding: 10px 14px; border-top: 1px solid #e2e8f0; border-bottom: 2px solid #cbd5e1; text-align: ${ar ? 'right' : 'left'}; }
                        .totals-box { display: flex; justify-content: flex-end; }
                        .totals-table { width: 280px; }
                        .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #475569; }
                        .row.grand { border-top: 2px solid #0f172a; margin-top: 6px; padding-top: 8px; font-size: 16px; font-weight: 800; color: #0f172a; }
                        .footer-note { margin-top: 28px; padding-top: 14px; border-top: 1px dashed #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
                      </style>
                    </head>
                    <body>
                      <div class="invoice-card">
                        <div class="header">
                          <div class="brand">
                            <img src="${logoSrc}" class="brand-logo" alt="Logo" />
                            <span class="brand-name">Perfume Note</span>
                          </div>
                          <div class="order-info">
                            <div class="order-id">${ar ? 'رقم الطلب:' : 'Order #'} ${selectedInvoiceOrder.id.slice(0, 8).toUpperCase()}</div>
                            <div class="order-date">${new Date(selectedInvoiceOrder.created_at).toLocaleString(ar ? 'ar-EG' : 'en-US')}</div>
                          </div>
                        </div>

                        <div class="info-grid">
                          <div class="info-box">
                            <div class="info-title">${ar ? 'بيانات العميل' : 'Customer Details'}</div>
                            <div class="info-text">${selectedInvoiceOrder.customer_name}</div>
                            <div class="info-text">${selectedInvoiceOrder.phone}</div>
                            <div class="info-text">${selectedInvoiceOrder.address}، ${selectedInvoiceOrder.governorate}</div>
                            ${mapLocationHtml}
                          </div>
                          <div class="info-box">
                            <div class="info-title">${ar ? 'تفاصيل الدفع' : 'Payment Details'}</div>
                            <div class="info-text">${ar ? 'طريقة الدفع:' : 'Method:'} ${selectedInvoiceOrder.payment_method}</div>
                            <div class="info-text">${ar ? 'حالة الطلب:' : 'Status:'} ${selectedInvoiceOrder.status}</div>
                          </div>
                        </div>

                        <table>
                          <thead>
                            <tr>
                              <th>${ar ? 'المنتج' : 'Item'}</th>
                              <th style="text-align: center;">${ar ? 'الكمية' : 'Qty'}</th>
                              <th style="text-align: left;">${ar ? 'السعر' : 'Price'}</th>
                              <th style="text-align: left;">${ar ? 'الإجمالي' : 'Total'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${itemsRows}
                          </tbody>
                        </table>

                        <div class="totals-box">
                          <div class="totals-table">
                            <div class="row">
                              <span>${ar ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                              <span>${subtotalVal} ${ar ? 'ج.م' : 'EGP'}</span>
                            </div>
                            <div class="row">
                              <span>${ar ? 'مصاريف الشحن:' : 'Shipping:'}</span>
                              <span>${selectedInvoiceOrder.shipping_cost.toFixed(2)} ${ar ? 'ج.م' : 'EGP'}</span>
                            </div>
                            ${selectedInvoiceOrder.discount > 0 ? `
                              <div class="row" style="color: #16a34a;">
                                <span>${ar ? 'الخصم:' : 'Discount:'}</span>
                                <span>- ${selectedInvoiceOrder.discount.toFixed(2)} ${ar ? 'ج.م' : 'EGP'}</span>
                              </div>
                            ` : ''}
                            ${selectedInvoiceOrder.wallet_used > 0 ? `
                              <div class="row" style="color: #2563eb; font-weight: 700;">
                                <span>${ar ? 'خصم المحفظة:' : 'Wallet Used:'}</span>
                                <span>- ${selectedInvoiceOrder.wallet_used.toFixed(2)} ${ar ? 'ج.م' : 'EGP'}</span>
                              </div>
                            ` : ''}
                            <div class="row grand">
                              <span>${ar ? 'المطلوب دفعه:' : 'Amount Due:'}</span>
                              <span>${selectedInvoiceOrder.total.toFixed(2)} ${ar ? 'ج.م' : 'EGP'}</span>
                            </div>
                          </div>
                        </div>

                        <div class="footer-note">
                          شكراً لتسوقكم مع Perfume Note! 🌿
                        </div>
                      </div>

                      <script>
                        window.onload = () => {
                          setTimeout(() => {
                            window.print();
                            window.close();
                          }, 300);
                        };
                      </script>
                    </body>
                  </html>
                `);
                printWindow.document.close();
              }}
            >
              <Printer className="w-4 h-4 mr-2 ml-2" />
              {ar ? "طباعة" : "Print"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LocationPickerModal
        open={editLocationModalOpen}
        onOpenChange={setEditLocationModalOpen}
        onConfirm={(loc) => {
          if (loc.address) {
            setEditAddress(loc.address);
          }
        }}
      />
    </StoreLayout>
  );
}

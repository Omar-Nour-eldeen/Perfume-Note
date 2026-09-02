import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ShoppingCart, Minus, Plus, Trash2, Loader2, CheckCircle2, ChevronRight, Gift, Percent, Tag, UserCircle } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import type { ShippingZone, DiscountCode } from "@/lib/types";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export function CartDrawer() {
  const { language } = useI18n();
  const ar = language === "ar";
  const { user, profile, refreshProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { items, isLoading, updateQuantity, removeItem, clearCart } = useCartStore();

  // Checkout and promo states
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<ShippingZone | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [activeCoupon, setActiveCoupon] = useState<DiscountCode | null>(null);

  // Customer checkout details
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  // Track if user manually changed the shipping zone this session
  const [zoneManuallyChanged, setZoneManuallyChanged] = useState(false);

  // Real-time: auto-refresh wallet balance when profile changes in DB
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`profile_balance_${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => { refreshProfile(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Pre-fill name, phone, address from profile (once per session open)
  useEffect(() => {
    if (profile && isOpen) {
      if (!name) setName(profile.name || "");
      if (!phone) setPhone(profile.phone || "");
      if (!address && profile.address) setAddress(profile.address);
    }
  }, [profile, isOpen]);

  // Auto-select shipping zone from profile governorate every time cart opens
  // or when profile/zones update — unless user manually picked a zone
  useEffect(() => {
    if (!isOpen) {
      // Reset manual flag when cart closes so next open is fresh
      setZoneManuallyChanged(false);
      return;
    }
    if (zoneManuallyChanged) return;
    if (profile?.governorate && shippingZones.length > 0) {
      const govLower = profile.governorate.toLowerCase().trim();
      const matchingZone = shippingZones.find(
        z =>
          z.name_ar.toLowerCase().trim() === govLower ||
          z.name_en.toLowerCase().trim() === govLower
      );
      if (matchingZone) {
        setSelectedZone(matchingZone);
        return;
      }
    }
    // Fall back to first zone if no match
    if (shippingZones.length > 0 && !selectedZone) {
      setSelectedZone(shippingZones[0] as ShippingZone);
    }
  }, [isOpen, profile?.governorate, shippingZones, zoneManuallyChanged]);

  // ─── verify helper (uses getState to always have fresh references) ───
  const verifyCartItems = async () => {
    const currentItems = useCartStore.getState().items;
    if (currentItems.length === 0) return;
    const { data } = await supabase
      .from("products")
      .select("id, is_active")
      .in("id", currentItems.map((i) => i.product.id));
    if (data) {
      data.forEach((p: any) => {
        if (p.is_active === false) {
          useCartStore.getState().removeItem(p['id']);
        }
      });
    }
  };

  // On mount: verify immediately + subscribe to realtime
  useEffect(() => {
    verifyCartItems();

    const channel = supabase
      .channel("cart-drawer-product-watch")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        (payload) => {
          const p = (payload as any)['new'] as any;
          if (p.is_active === false) {
            useCartStore.getState().removeItem(p['id']);
          }
        }
      )
      // Handle DELETE events for removed products
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "products" },
        (payload: any) => {
          try {
            const oldPayload = payload as unknown as { old?: Record<string, unknown> };
            const oldData = oldPayload['old'];
            if (oldData && typeof oldData === 'object' && 'id' in oldData) {
              const productId = oldData['id'];
              useCartStore.getState().removeItem(productId as string);
            }
          } catch (e) {
            // Silently fail on DELETE
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // While drawer is open: poll every 8s as a guaranteed fallback
  useEffect(() => {
    if (!isOpen) return;
    verifyCartItems(); // immediate check when opened
    const interval = setInterval(verifyCartItems, 8000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const fetchShippingZones = async () => {
    const { data } = await supabase.from("shipping_zones").select("*").order("cost", { ascending: true });
    if (data) {
      setShippingZones(data as ShippingZone[]);
      if (data.length > 0 && !selectedZone) setSelectedZone(data[0] as ShippingZone);
    }
  };

  // Real-time: auto-update shipping zones when admin changes them
  useEffect(() => {
    fetchShippingZones();

    const zonesChannel = supabase
      .channel("cart_shipping_zones")
      .on("postgres_changes", { event: "*", schema: "public", table: "shipping_zones" }, () => {
        fetchShippingZones();
      })
      .subscribe();

    return () => { supabase.removeChannel(zonesChannel); };
  }, []);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    const { data, error } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("code", couponCode.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      toast.error(ar ? "كود الخصم غير صالح" : "Invalid coupon code");
      setActiveCoupon(null);
      return;
    }

    const coupon = data as DiscountCode;
    if (subtotal < Number(coupon.min_order)) {
      toast.error(
        ar
          ? `الحد الأدنى لاستخدام هذا الكود هو ${coupon.min_order} ر.س`
          : `Minimum order for this coupon is ${coupon.min_order} EGP`
      );
      setActiveCoupon(null);
      return;
    }

    setActiveCoupon(coupon);
    toast.success(ar ? "تم تطبيق كود الخصم بنجاح" : "Coupon applied successfully");
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Discount calculation
  let discountAmount = 0;
  if (activeCoupon) {
    if (activeCoupon.type === "percentage") {
      discountAmount = (subtotal * Number(activeCoupon.value)) / 100;
    } else {
      discountAmount = Number(activeCoupon.value);
    }
  }

  const shippingCost = selectedZone ? Number(selectedZone.cost) : 0;
  const originalTotal = Math.max(0, subtotal - discountAmount + shippingCost);

  const walletBalance = profile?.balance ? Math.round(Number(profile.balance) * 100) / 100 : 0;
  const walletApplied = useWallet && walletBalance > 0 ? Math.round(Math.min(walletBalance, originalTotal) * 100) / 100 : 0;
  const finalTotal = Math.round((originalTotal - walletApplied) * 100) / 100;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    
    if (!name.trim() || !phone.trim() || !address.trim() || !selectedZone) {
      toast.error(ar ? "يرجى ملء جميع البيانات المطلوبة" : "Please fill in all required fields");
      return;
    }

    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone.trim())) {
      toast.error(ar ? "يرجى إدخال رقم هاتف صحيح (10-15 أرقام فقط)" : "Please enter a valid phone number (10-15 digits only)");
      return;
    }

    const outOfStockItem = items.find(i => i.quantity > (i.product.stock || 0));
    if (outOfStockItem) {
      const title = ar ? outOfStockItem.product.title_ar : outOfStockItem.product.title_en;
      toast.error(ar ? `الكمية المطلوبة من ${title} غير متوفرة في المخزون` : `Requested quantity for ${title} is out of stock`);
      return;
    }

    // Check user's pending quantity for each product doesn't exceed stock
    const productIds = items.map(i => i.product.id);
    
    // 1. Get user's pending orders
    let query = supabase.from("orders").select("id").eq("status", "pending");
    if (user) {
      query = query.eq("user_id", user.id);
    } else {
      query = query.eq("phone", phone.trim());
    }
    const { data: pendingOrders } = await query;
    const pendingOrderIds = (pendingOrders || []).map(o => o.id);

    // 2. Get order items for those pending orders
    let pendingItems: any[] = [];
    if (pendingOrderIds.length > 0) {
      const { data: itemsData } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .in("order_id", pendingOrderIds)
        .in("product_id", productIds);
      pendingItems = itemsData || [];
    }

    for (const item of items) {
      const alreadyPending = pendingItems
        .filter(p => p.product_id === item.product.id)
        .reduce((sum, p) => sum + p.quantity, 0);

      const availableStock = item.product.stock || 0;
      if (alreadyPending + item.quantity > availableStock) {
        const title = ar ? item.product.title_ar : item.product.title_en;
        toast.error(
          ar
            ? `لقد طلبت من قبل "${title}" في طلبات قيد الانتظار. إجمالي الكمية المطلوبة يتجاوز المخزون المتاح.`
            : `You already have pending orders for "${title}". The total requested quantity exceeds available stock.`
        );
        return;
      }
    }


    setIsSubmitting(true);
    try {
      let orderId = null;

      if (walletApplied > 0 && user?.id) {
        // Use RPC if wallet is applied
        const orderItemsPayload = items.map((item) => ({
          product_id: item.product.id,
          title: ar ? item.product.title_ar : item.product.title_en,
          price: item.product.price,
          quantity: item.quantity,
        }));

        const { data, error: rpcErr } = await supabase.rpc("checkout_with_wallet", {
          p_user_id: user.id,
          p_subtotal: subtotal,
          p_shipping_cost: shippingCost,
          p_discount: discountAmount,
          p_wallet_used: walletApplied,
          p_total: finalTotal,
          p_customer_name: name,
          p_phone: phone,
          p_address: address,
          p_governorate: ar ? selectedZone.name_ar : selectedZone.name_en,
          p_discount_code: activeCoupon?.code || null,
          p_payment_method: "Cash on Delivery",
          p_items: orderItemsPayload
        });

        if (rpcErr) throw rpcErr;
        orderId = data;
      } else {
        // Standard insert
        const { data: order, error: oErr } = await supabase
          .from("orders")
          .insert({
            user_id: user?.id || null,
            status: "pending",
            subtotal,
            shipping_cost: shippingCost,
            discount: discountAmount,
            wallet_used: 0,
            total: finalTotal,
            customer_name: name,
            phone,
            address,
            governorate: ar ? selectedZone.name_ar : selectedZone.name_en,
            discount_code: activeCoupon?.code || null,
            payment_method: "Cash on Delivery",
          })
          .select()
          .single();

        if (oErr) throw oErr;
        orderId = order.id;

        const orderItemsPayload = items.map((item) => ({
          order_id: orderId,
          product_id: item.product.id,
          title: ar ? item.product.title_ar : item.product.title_en,
          price: item.product.price,
          quantity: item.quantity,
        }));

        const { error: iErr } = await supabase.from("order_items").insert(orderItemsPayload);
        if (iErr) throw iErr;
      }



      // Setup notification messages
      let adminBodyAr = `تلقيت طلباً جديداً من ${name}.`;
      let adminBodyEn = `You received a new order from ${name}.`;
      let userBodyAr = "تم استلام طلبك بنجاح وجاري تجهيزه.";
      let userBodyEn = "Your order has been received successfully and is being processed.";

      if (walletApplied > 0) {
        adminBodyAr += `\nالإجمالي: ${originalTotal.toFixed(2)} ج.م (سيتم خصم ${walletApplied.toFixed(2)} من المحفظة، المطلوب عند الاستلام: ${finalTotal.toFixed(2)})`;
        adminBodyEn += `\nTotal: ${originalTotal.toFixed(2)} EGP (${walletApplied.toFixed(2)} from wallet, Cash on delivery: ${finalTotal.toFixed(2)})`;
        
        userBodyAr += `\nسيتم خصم ${walletApplied.toFixed(2)} ج.م من محفظتك. المبلغ المطلوب دفعه عند الاستلام هو ${finalTotal.toFixed(2)} ج.م.`;
        userBodyEn += `\n${walletApplied.toFixed(2)} EGP will be deducted from your wallet. Amount due on delivery is ${finalTotal.toFixed(2)} EGP.`;
      }

      // Notify admin
      await createNotification({
        user_id: "admin",
        type: "new_order",
        title_ar: "طلب جديد",
        title_en: "New Order",
        body_ar: adminBodyAr,
        body_en: adminBodyEn,
        link: "/admin/orders",
      });

      // Notify user if logged in
      if (user?.id) {
        await createNotification({
          user_id: user.id,
          type: "order_update",
          title_ar: "تم تأكيد طلبك",
          title_en: "Order Confirmed",
          body_ar: userBodyAr,
          body_en: userBodyEn,
          link: "/account",
        });
      }

      toast.success(ar ? "تم تسجيل طلبك بنجاح!" : "Order placed successfully!");
      clearCart();
      setIsOpen(false);
      // Refresh wallet balance immediately
      if (walletApplied > 0) await refreshProfile();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button data-cart-trigger variant="outline" size="icon" className="relative border-border/60 bg-background">
          <ShoppingCart className="h-5 w-5 text-foreground" />
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full border-0 bg-primary p-0 text-[11px] font-semibold text-white flex items-center justify-center">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side={ar ? "left" : "right"} className="w-full border-l border-border bg-background sm:max-w-lg flex flex-col overflow-y-auto">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="font-bold text-2xl text-foreground">
            {ar ? "سلة المشتريات" : "Shopping Cart"}
          </SheetTitle>
          <SheetDescription className="text-muted-foreground text-xs">
            {totalItems === 0
              ? (ar ? "سلتك فارغة" : "Your cart is empty")
              : (ar ? `لديك ${totalItems} منتج في السلة` : `${totalItems} items in your cart`)}
          </SheetDescription>
        </SheetHeader>

        {items.length > 0 && (
          <div className="flex-1 flex flex-col gap-6 pt-6">
            {/* Items list */}
            <div className="space-y-3">
              {items.map((item) => {
                const title = ar ? item.product.title_ar : item.product.title_en;
                return (
                  <div key={item.product.id} className="flex gap-4 p-3 rounded-xl border border-border/60 bg-card">
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                      {item.product.images?.[0] && (
                        <img src={item.product.images[0]} alt={title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground text-sm truncate">{title}</h4>
                      <p className="font-black text-primary text-xs mt-1">
                        {item.product.price.toFixed(2)} {ar ? "ج.م" : "EGP"}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.product.stock < 10 ? (
                        <span className="text-orange-500 font-semibold">
                          {ar ? `متبقي: ${item.product.stock}` : `Stock: ${item.product.stock}`}
                        </span>
                      ) : (
                        <span>{ar ? "متوفر" : "In Stock"}</span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <button onClick={() => removeItem(item.product.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-0.5">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded-md hover:bg-background shadow-sm" 
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min="1"
                          max="11"
                          value={item.quantity}
                          onChange={(e) => {
                            // Remove non-numeric characters
                            const val = e.target.value.replace(/\D/g, '');
                            if (val === '') {
                              updateQuantity(item.product.id, 1);
                            } else {
                              // Max is stock available
                              const maxAllowed = item.product.stock || 0;
                              const num = Math.min(Math.max(parseInt(val, 10), 1), maxAllowed);
                              updateQuantity(item.product.id, num);
                            }
                          }}
                          className="text-xs font-bold w-6 text-center border border-border rounded px-0.5 bg-background"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded-md hover:bg-background shadow-sm" 
                          onClick={() => {
                            if (item.quantity >= (item.product.stock || 0)) {
                              toast.error(ar ? "لقد وصلت للحد الأقصى المتاح من المخزون" : "You have reached the maximum available stock");
                              return;
                            }
                            if (item.quantity >= (item.product.stock || 0)) {
                              toast.error(ar ? "الكمية المطلوبة غير متوفرة في المخزون" : "Requested quantity is out of stock");
                              return;
                            }
                            updateQuantity(item.product.id, item.quantity + 1);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Discounts and coupon promo code validation */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={ar ? "كود الخصم" : "Coupon Code"}
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 text-xs rounded-lg border border-border bg-card px-3 py-2 text-foreground uppercase outline-none"
              />
              <Button size="sm" onClick={applyCoupon} className="bg-primary text-white text-xs">
                {ar ? "تطبيق" : "Apply"}
              </Button>
            </div>

            {/* Shipping zone selector */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {ar ? "مدينة الشحن" : "Shipping Destination"}
              </label>
              <select
                className="w-full text-xs rounded-lg border border-border bg-card p-2.5 text-foreground outline-none"
                value={selectedZone?.id || ""}
                onChange={(e) => {
                  setZoneManuallyChanged(true);
                  setSelectedZone(shippingZones.find((z) => z.id === e.target.value) || null);
                }}
              >
                {shippingZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {ar ? z.name_ar : z.name_en} (+{z.cost.toFixed(2)} {ar ? "ج.م" : "EGP"})
                  </option>
                ))}
              </select>
            </div>

            {/* Checkout details form */}
            {!user ? (
              <div className="space-y-3 pt-6 border-t border-border text-center">
                <p className="text-sm font-semibold text-foreground mb-4">
                  {ar ? "يجب عليك تسجيل الدخول لإتمام الطلب." : "You must be logged in to checkout."}
                </p>
                <Link to="/auth/login" className="flex items-center justify-center w-full bg-primary text-white py-3.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">
                  {ar ? "تسجيل الدخول" : "Login"}
                </Link>
                <Link to="/auth/register" className="flex items-center justify-center w-full bg-secondary text-foreground py-3.5 rounded-lg font-bold text-sm hover:opacity-80 transition-opacity">
                  {ar ? "إنشاء حساب جديد" : "Create New Account"}
                </Link>
              </div>
            ) : (
            <form onSubmit={handleCheckout} className="space-y-3 pt-4 border-t border-border">
              <h4 className="font-bold text-sm text-foreground">{ar ? "تفاصيل التوصيل" : "Delivery Details"}</h4>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={ar ? "الاسم بالكامل" : "Full Name"}
                className="w-full text-xs rounded-lg border border-border bg-card px-3 py-2.5 text-foreground outline-none"
              />
              <input
                required
                type="tel"
                maxLength={11}
                pattern="01[0-5][0-9]{8}"
                value={phone}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, '');
                  val = val.slice(0, 11);
                  setPhone(val);
                }}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  const phoneRegex = /^01[0-5][0-9]{8}$/;
                  
                  if (val && !phoneRegex.test(val)) {
                    toast.error(ar ? "رقم مصري غير صحيح (01X XXXXXXXX)" : "Invalid Egyptian phone (01X XXXXXXXX)");
                    setPhone("");
                    return;
                  }
                }}
                inputMode="numeric"
                dir="ltr"
                title="رقم مصري (01[0-5] رلم 8 أرقام)"
                placeholder={ar ? "رقم الهاتف" : "Phone Number"}
                className="w-full text-xs rounded-lg border border-border bg-card px-3 py-2.5 text-foreground outline-none"
              />
              <input
                required
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={ar ? "العنوان بالتفصيل (الشارع، الحي...)" : "Street address, district..."}
                className="w-full text-xs rounded-lg border border-border bg-card px-3 py-2.5 text-foreground outline-none"
              />

              {profile && walletBalance > 0 && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="useWallet"
                    checked={useWallet}
                    onChange={(e) => setUseWallet(e.target.checked)}
                    className="w-4 h-4 rounded text-primary border-border focus:ring-primary focus:ring-offset-background bg-card"
                  />
                  <label htmlFor="useWallet" className="text-sm font-semibold text-foreground cursor-pointer select-none">
                    {ar ? `استخدام رصيد المحفظة (${walletBalance.toFixed(2)} ج.م)` : `Use wallet balance (${walletBalance.toFixed(2)} EGP)`}
                  </label>
                </div>
              )}

              {/* Order total logs summary */}
              <div className="pt-4 space-y-2 text-xs border-t border-dashed border-border/80">
                <div className="flex justify-between text-muted-foreground">
                  <span>{ar ? "إجمالي المنتجات" : "Subtotal"}</span>
                  <span>{subtotal.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{ar ? "الخصم" : "Discount"}</span>
                    <span>-{discountAmount.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>{ar ? "تكلفة الشحن" : "Shipping Cost"}</span>
                  <span>{shippingCost.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                </div>
                {walletApplied > 0 && (
                  <div className="flex justify-between text-blue-600 font-bold">
                    <span>{ar ? "خصم من المحفظة" : "Wallet Applied"}</span>
                    <span>-{walletApplied.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-foreground pt-1">
                  <span>{ar ? "الإجمالي النهائي" : "Total Cost"}</span>
                  <span>{finalTotal.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white py-6 mt-4"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  ar ? "تأكيد الطلب (الدفع عند الاستلام)" : "Confirm Order (Cash on Delivery)"
                )}
              </Button>
            </form>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

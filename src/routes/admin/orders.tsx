import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, ReceiptText, Printer, RotateCcw, MapPin, Copy, ExternalLink } from "lucide-react";
import type { Order, OrderItem, ReturnRequest } from "@/lib/types";
import { toast } from "sonner";
import { createNotification } from "@/lib/notifications";
import { siteAssets } from "@/lib/site-assets";

export const Route = createFileRoute("/admin/orders")({
  validateSearch: (search: Record<string, unknown>): { tab?: string; orderId?: string; returnId?: string } => {
    const res: { tab?: string; orderId?: string; returnId?: string } = {};
    if (search["tab"]) res.tab = search["tab"] as string;
    if (search["orderId"]) res.orderId = search["orderId"] as string;
    if (search["returnId"]) res.returnId = search["returnId"] as string;
    return res;
  },
  component: AdminOrders,
});

function AdminOrders() {
  const { language } = useI18n();
  const ar = language === "ar";
  const { tab, orderId, returnId } = Route.useSearch();
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [highlightedReturnId, setHighlightedReturnId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "returns">(tab === "returns" ? "returns" : "orders");
  const [loading, setLoading] = useState(true);
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, OrderItem[]>>({});
  const [orderEmailsMap, setOrderEmailsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchTab = urlParams.get("tab") || tab;
    const searchReturnId = urlParams.get("returnId") || returnId;
    const searchOrderId = urlParams.get("orderId") || orderId;

    const isReturnTarget =
      searchReturnId ||
      searchTab === "returns" ||
      returnId ||
      tab === "returns" ||
      (searchOrderId && returns.some((r) => r.order_id === searchOrderId));

    if (isReturnTarget) {
      setActiveTab("returns");
    } else if (searchTab === "orders" || tab === "orders") {
      setActiveTab("orders");
    }
  }, [tab, returnId, orderId, returns]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetOrderId =
      orderId ||
      urlParams.get("orderId") ||
      window.location.hash.replace("#order-", "");

    const targetReturnId =
      returnId ||
      urlParams.get("returnId") ||
      window.location.hash.replace("#return-", "");

    if ((!targetOrderId && !targetReturnId) || loading) return;

    const searchTab = urlParams.get("tab") || tab;
    if (targetReturnId || searchTab === "returns" || (targetOrderId && returns.some((r) => r.order_id === targetOrderId))) {
      setActiveTab("returns");
    }

    const timer = setTimeout(() => {
      let el: HTMLElement | null = null;
      if (targetReturnId) {
        el =
          document.getElementById(`admin-return-${targetReturnId}`) ||
          document.getElementById(`admin-return-desktop-${targetReturnId}`) ||
          (document.querySelector(`[data-return-id="${targetReturnId}"]`) as HTMLElement | null);
      }
      if (!el && targetOrderId) {
        el =
          document.getElementById(`admin-return-${targetOrderId}`) ||
          document.getElementById(`admin-return-desktop-${targetOrderId}`) ||
          document.getElementById(`admin-order-${targetOrderId}`) ||
          document.getElementById(`admin-order-desktop-${targetOrderId}`) ||
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
    }, 400);

    return () => clearTimeout(timer);
  }, [loading, orderId, returnId, activeTab, orders, returns]);

  // Message Modal State
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Rejection State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedReturnToReject, setSelectedReturnToReject] = useState<ReturnRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Activity State
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [selectedOrderActivity, setSelectedOrderActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Received Items Modal State
  const [receivedModalOpen, setReceivedModalOpen] = useState(false);
  const [selectedReturnToReceive, setSelectedReturnToReceive] = useState<ReturnRequest | null>(null);
  const [adminReceivedItems, setAdminReceivedItems] = useState<Record<string, number>>({});

  // Invoice Modal State
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  const logActivity = async (orderId: string, userId: string | null, action: string, descAr: string, descEn: string) => {
    try {
      await supabase.from("order_activity").insert({
        order_id: orderId,
        user_id: userId,
        action,
        description_ar: descAr,
        description_en: descEn,
      });
    } catch (e) {
      console.error("Failed to log activity", e);
    }
  };

  useEffect(() => {
    fetchOrdersAndReturns();

    // Real-time subscription for admin panel
    const ordersChannel = supabase
      .channel("admin_orders_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          console.log("Admin realtime order update:", payload);
          fetchOrdersAndReturns();
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status (admin orders):", status);
      });

    const returnsChannel = supabase
      .channel("admin_returns_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "returns" },
        (payload) => {
          console.log("Admin realtime return update:", payload);
          fetchOrdersAndReturns();
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status (admin returns):", status);
      });

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(returnsChannel);
    };
  }, []);

  const fetchOrdersAndReturns = async () => {
    setLoading(true);
    try {
      const { data: oData } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      const fetchedOrders = oData as Order[] || [];
      setOrders(fetchedOrders);

      // Fetch order items for all orders
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

      // Fetch emails from profiles for orders with user_id
      const userIds = fetchedOrders
        .filter((o) => o.user_id)
        .map((o) => o.user_id as string);
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);
        if (profilesData) {
          const emailMap: Record<string, string> = {};
          (profilesData as { id: string; email: string }[]).forEach((p) => {
            emailMap[p.id] = p.email;
          });
          setOrderEmailsMap(emailMap);
        }
      }

      const { data: rData } = await supabase
        .from("returns")
        .select(`
          *,
          orders (*),
          profiles:user_id (name, email)
        `)
        .order("created_at", { ascending: false });
      setReturns(rData as any[] || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;

      const order = orders.find(o => o.id === orderId);

      toast.success(ar ? "تم تحديث حالة الطلب" : "Order status updated");

      // Log activity
      await logActivity(
        orderId,
        order?.user_id || null,
        "STATUS_CHANGED",
        `تم تغيير حالة الطلب إلى: ${newStatus}`,
        `Order status changed to: ${newStatus}`
      );

      // Notify customer
      if (order?.user_id) {
        const statusLabels: Record<string, { ar: string; en: string }> = {
          pending: { ar: "قيد الانتظار", en: "Pending" },
          processing: { ar: "جاري التجهيز", en: "Processing" },
          shipped: { ar: "تم الشحن", en: "Shipped" },
          delivered: { ar: "تم التوصيل", en: "Delivered" },
          cancelled: { ar: "ملغي", en: "Cancelled" },
        };
        const labelAr = statusLabels[newStatus]?.ar ?? newStatus;
        const labelEn = statusLabels[newStatus]?.en ?? newStatus;
        await createNotification({
          user_id: order.user_id,
          type: "order_update",
          title_ar: "تحديث حالة الطلب",
          title_en: "Order Status Updated",
          body_ar: `تم تحديث حالة طلبك إلى: ${labelAr}`,
          body_en: `Your order status has been updated to: ${labelEn}`,
          link: `/account?orderId=${order.id}`,
        });
      }

      fetchOrdersAndReturns();
    } catch (err: any) {
      const msg: string = err.message || "";
      if (msg.toLowerCase().includes("stock") || msg.toLowerCase().includes("insufficient") || msg.toLowerCase().includes("quantity")) {
        toast.error(ar ? "لا يمكن تجهيز الطلب" : "Cannot process order", {
          description: ar
            ? "الكمية المطلوبة غير متوفرة في المخزون حالياً."
            : "Insufficient stock for one or more items in this order.",
        });
      } else {
        toast.error(err.message);
      }
    }
  };

  const handleUpdateReturnStatus = async (ret: ReturnRequest, newStatus: string, reason?: string) => {
    try {
      if (newStatus === "completed" && ret.refunded) {
        toast.error(ar ? "عفواً، تم رد المبلغ مسبقاً لهذا الطلب!" : "Refund already processed for this request!");
        return;
      }

      // Update return record status
      const updateData: any = { status: newStatus };
      if (newStatus === "rejected") {
        updateData.rejection_reason = reason;
        updateData.rejected_at = new Date().toISOString();
      }
      if (newStatus === "reopened") {
        // clear rejection reason
        updateData.rejection_reason = null;
        updateData.rejected_at = null;
      }
      if (newStatus === "received") {
        // Assume adminReceivedItems is passed or set previously, 
        // we'll handle this directly from the modal submission function, 
        // but if it comes through here without it, we shouldn't overwrite.
        // Wait, the modal function can just call this with the third arg or we handle it separately.
        // I'll create a dedicated function for marking as received to keep it clean.
      }
      if (newStatus === "completed") {
        updateData.refunded = true;
      }

      const { error: rErr } = await supabase
        .from("returns")
        .update(updateData)
        .eq("id", ret.id);

      if (rErr) throw rErr;

      // Log activity
      let action = "RETURN_UPDATED";
      let descAr = `تحديث طلب الاسترجاع إلى: ${newStatus}`;
      let descEn = `Return request updated to: ${newStatus}`;

      if (newStatus === "approved") {
        action = "RETURN_APPROVED";
        descAr = "تمت الموافقة على طلب الاسترجاع";
        descEn = "Return request approved";
      } else if (newStatus === "rejected") {
        action = "RETURN_REJECTED";
        descAr = `تم رفض طلب الاسترجاع. السبب: ${reason}`;
        descEn = `Return request rejected. Reason: ${reason}`;
      } else if (newStatus === "received") {
        action = "RETURN_RECEIVED";
        descAr = "تم استلام المرتجع";
        descEn = "Return received";
      } else if (newStatus === "completed") {
        action = "RETURN_COMPLETED";
        descAr = "اكتمل طلب الاسترجاع وتم رد المبلغ";
        descEn = "Return completed and refunded";
      } else if (newStatus === "reopened") {
        action = "RETURN_REOPENED";
        descAr = "تم إعادة فتح طلب الاسترجاع للمراجعة وتعديل العميل";
        descEn = "Return request reopened for customer edit";
      } else if (newStatus === "cancelled") {
        action = "RETURN_CANCELLED";
        descAr = "تم إلغاء طلب الاسترجاع";
        descEn = "Return request cancelled";
      }

      await logActivity(ret.order_id, ret.user_id, action, descAr, descEn);

      // Processing transitions that affect orders/wallet
      if (newStatus === "approved") {
        await supabase.from("orders").update({ status: "returned" }).eq("id", ret.order_id);
      }

      if (newStatus === "completed") {
        // Credit balance transaction based on actual received items
        // The refund amount was already set in the DB when it was marked "received"
        // so we can just use ret.refund_amount. 
        // BUT wait, when `markAsReceived` is called, it updates DB `refund_amount`. 
        // This function `handleUpdateReturnStatus` receives the `ret` object BEFORE the update.
        // Let's refetch the return to get the updated refund_amount before inserting transaction!
        const { data: updatedRet } = await supabase.from("returns").select("refund_amount, received_items").eq("id", ret.id).single();
        const finalRefundAmount = updatedRet?.refund_amount || ret.refund_amount;

        const { error: tErr } = await supabase
          .from("wallet_transactions")
          .insert({
            user_id: ret.user_id,
            amount: Number(finalRefundAmount),
            type: "refund",
            description: `Refund for order #${ret.order_id.slice(0, 8)}`,
          });

        if (tErr) {
          // If transaction fails, revert refunded status
          await supabase.from("returns").update({ refunded: false }).eq("id", ret.id);
          throw tErr;
        }

        // --- UPDATE STOCK ---
        const receivedItems = (updatedRet as any)?.received_items || ret.received_items || ret.returned_items || [];
        for (const item of receivedItems) {
          if (item.quantity > 0) {
            // We need product_id. The item.item_id is the order_item id.
            // We can find the product_id from orderItemsMap, or we can fetch it.
            const oiData = orderItemsMap[ret.order_id]?.find(oi => oi.id === item.item_id);
            const productId = oiData?.product_id;

            if (productId) {
              const { data: pData } = await supabase.from("products").select("stock").eq("id", productId).single();
              if (pData) {
                await supabase.from("products").update({ stock: pData.stock + item.quantity }).eq("id", productId);
              }
            }
          }
        }
      }

      toast.success(ar ? "تم تحديث حالة طلب الاسترجاع بنجاح" : "Return status updated successfully");

      // Notify customer
      if (newStatus !== "pending") {
        let notifTitleAr = "تحديث طلب الاسترجاع";
        let notifTitleEn = "Return Request Updated";
        let notifBodyAr = descAr;
        let notifBodyEn = descEn;

        if (newStatus === "reopened") {
          notifTitleAr = "تم إعادة فتح طلب الاسترجاع";
          notifTitleEn = "Return Request Reopened";
          notifBodyAr = "تم إعادة فتح طلب الاسترجاع الخاص بك، يرجى مراجعته وتعديله وإعادة إرساله.";
          notifBodyEn = "Your return request has been reopened. Please review, edit and resubmit it.";
        } else if (newStatus === "completed") {
          const refundAmt = ret.refund_amount;
          notifTitleAr = "اكتمل طلب الاسترجاع وتم رد المبلغ";
          notifTitleEn = "Return Completed & Refunded";
          notifBodyAr = `تم إكمال طلب الاسترجاع بنجاح. تم رد مبلغ ${refundAmt.toFixed(2)} ج.م إلى رصيد محفظتك.`;
          notifBodyEn = `Your return has been completed. A refund of ${refundAmt.toFixed(2)} EGP has been added to your wallet.`;
        }

        await createNotification({
          user_id: ret.user_id,
          type: "return_update",
          title_ar: notifTitleAr,
          title_en: notifTitleEn,
          body_ar: notifBodyAr,
          body_en: notifBodyEn,
          link: `/account?orderId=${ret.order_id}`,
        });
      }

      fetchOrdersAndReturns();
      if (newStatus === "rejected") {
        setRejectModalOpen(false);
        setRejectionReason("");
        setSelectedReturnToReject(null);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openReceiveModal = (ret: ReturnRequest) => {
    setSelectedReturnToReceive(ret);
    const initialQty: Record<string, number> = {};
    const items = ret.returned_items || [];
    items.forEach(item => {
      initialQty[item.item_id] = item.quantity;
    });
    setAdminReceivedItems(initialQty);
    setReceivedModalOpen(true);
  };

  const submitReceivedItems = async () => {
    if (!selectedReturnToReceive) return;
    try {
      const items = selectedReturnToReceive.returned_items || [];
      const receivedItemsArr = items.map(item => ({
        ...item,
        quantity: adminReceivedItems[item.item_id] || 0
      })).filter(item => item.quantity > 0);

      // Calculate new refund amount based on received items
      const newRefundAmount = receivedItemsArr.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const { error } = await supabase
        .from("returns")
        .update({
          status: "received",
          received_items: receivedItemsArr,
          refund_amount: newRefundAmount
        })
        .eq("id", selectedReturnToReceive.id);

      if (error) throw error;

      await logActivity(
        selectedReturnToReceive.order_id,
        selectedReturnToReceive.user_id,
        "RETURN_RECEIVED",
        "تم استلام المرتجع وتحديد الكميات",
        "Return received and quantities verified"
      );

      // Build item list for notification
      const isEdit = selectedReturnToReceive.status === "received";
      const itemListAr = receivedItemsArr.map(i => `${i.title} × ${i.quantity}`).join("\n• ");
      const itemListEn = receivedItemsArr.map(i => `${i.title} × ${i.quantity}`).join("\n• ");
      await createNotification({
        user_id: selectedReturnToReceive.user_id,
        type: "return_update",
        title_ar: isEdit ? "تم تعديل استلام المرتجع" : "تم استلام مرتجعاتك",
        title_en: isEdit ? "Return Receipt Updated" : "Your Return Has Been Received",
        body_ar: `تم ${isEdit ? "تعديل" : ""} استلام المنتجات التالية:\n• ${itemListAr}\nالمبلغ المسترد: ${newRefundAmount.toFixed(2)} ج.م`,
        body_en: `The following items were ${isEdit ? "updated in" : ""} received:\n• ${itemListEn}\nRefund amount: ${newRefundAmount.toFixed(2)} EGP`,
        link: `/account?orderId=${selectedReturnToReceive.order_id}`,
      });

      toast.success(ar ? "تم تأكيد الاستلام بنجاح" : "Received confirmed successfully");
      setReceivedModalOpen(false);
      setSelectedReturnToReceive(null);
      fetchOrdersAndReturns();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openActivityLog = async (orderId: string) => {
    setActivityModalOpen(true);
    setLoadingActivity(true);
    try {
      const { data, error } = await supabase
        .from("order_activity")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSelectedOrderActivity(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUserId || !messageBody) return;
    setSendingMessage(true);
    try {
      const messageId = crypto.randomUUID();
      const payload = {
        id: messageId,
        sender_id: selectedUserId, // user ID
        session_id: `user_${selectedUserId}`, // session ID format used in chat
        message: messageBody,
        is_admin: true,
      };

      const { error } = await supabase.from("chat_messages").insert(payload);
      if (error) throw error;

      // Also send a notification about the new message
      await createNotification({
        user_id: selectedUserId,
        type: "new_chat_message",
        title_ar: "رسالة جديدة من الدعم 💬",
        title_en: "New message from support 💬",
        body_ar: messageBody,
        body_en: messageBody,
        link: "/?openChat=true",
      });

      toast.success(ar ? "تم إرسال الرسالة بنجاح للعميل" : "Message sent successfully to customer");
      setMessageModalOpen(false);
      setMessageBody("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const openMessageModal = (userId: string) => {
    setSelectedUserId(userId);
    setMessageModalOpen(true);
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-black text-foreground">
              {ar ? "الطلبات والمرتجعات" : "Orders & Returns"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {ar ? "إدارة طلبات التوصيل ومعالجة طلبات الاسترجاع" : "Manage delivery orders and process return requests"}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab("orders")}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
                activeTab === "orders" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              <span>{ar ? "طلبات العملاء" : "Customer Orders"}</span>
              <span className="text-xs bg-secondary text-foreground/80 px-2 py-0.5 rounded-full font-mono">{orders.length}</span>
            </button>
            <button
              onClick={() => setActiveTab("returns")}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
                activeTab === "returns" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              <span>{ar ? "طلبات الاسترجاع" : "Return Requests"}</span>
              {returns.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                  returns.some(r => r.status === 'pending') ? 'bg-red-500 text-white animate-pulse' : 'bg-secondary text-foreground/80'
                }`}>
                  {returns.length}
                </span>
              )}
            </button>
          </div>

          {loading ? (
            <span className="text-muted-foreground">{ar ? "جاري التحميل..." : "Loading..."}</span>
          ) : activeTab === "orders" ? (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              {/* ── MOBILE: Card layout ── */}
              <div className="md:hidden divide-y divide-border">
                {orders.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">{ar ? "لا توجد طلبات بعد" : "No orders yet"}</p>
                ) : orders.map((order) => {
                  const items = orderItemsMap[order.id] || [];
                  const associatedReturn = returns.find((r) => r.order_id === order.id);
                  const goToReturn = () => {
                    setActiveTab("returns");
                    if (associatedReturn) setHighlightedReturnId(associatedReturn.id);
                    setHighlightedOrderId(order.id);
                    setTimeout(() => {
                      const el =
                        (associatedReturn && (document.getElementById(`admin-return-${associatedReturn.id}`) || document.getElementById(`admin-return-desktop-${associatedReturn.id}`))) ||
                        document.getElementById(`admin-return-${order.id}`) ||
                        document.getElementById(`admin-return-desktop-${order.id}`) ||
                        (document.querySelector(`[data-order-id="${order.id}"]`) as HTMLElement | null);
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 200);
                  };

                  return (
                    <div
                      key={order.id}
                      id={`admin-order-${order.id}`}
                      data-order-id={order.id}
                      className={`p-4 space-y-3 transition-all duration-500 ${
                        highlightedOrderId === order.id
                          ? "bg-primary/10 ring-2 ring-primary border border-primary shadow-lg rounded-xl"
                          : ""
                      }`}
                    >
                      {/* Header row: name + status badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-foreground text-sm">{order.customer_name}</p>
                          {order.user_id && orderEmailsMap[order.user_id] && (
                            <p className="text-xs text-muted-foreground">{orderEmailsMap[order.user_id]}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{order.phone}</p>
                        </div>
                        <div className="shrink-0">
                          {associatedReturn ? (
                            <button
                              type="button"
                              onClick={goToReturn}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 transition cursor-pointer"
                              title={ar ? "انتقال إلى طلب الاسترجاع" : "Go to Return Request"}
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{ar ? "طلب استرجاع" : "Return Request"}</span>
                            </button>
                          ) : order.status === "cancelled" ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">{ar ? "ملغي" : "Cancelled"}</span>
                          ) : order.status === "delivered" ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">{ar ? "تم التوصيل" : "Delivered"}</span>
                          ) : order.status === "returned" ? (
                            <button
                              type="button"
                              onClick={goToReturn}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 transition cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{ar ? "مُرتجع" : "Returned"}</span>
                            </button>
                          ) : order.status === "shipped" ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{ar ? "تم الشحن" : "Shipped"}</span>
                          ) : order.status === "processing" ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">{ar ? "جاري التجهيز" : "Processing"}</span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">{ar ? "قيد الانتظار" : "Pending"}</span>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <p className="text-xs text-muted-foreground">{order.address}، {order.governorate}</p>
                      {order.latitude && order.longitude && (
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <a
                            href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline bg-primary/10 px-2 py-0.5 rounded"
                          >
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{ar ? "الموقع على الخريطة" : "Google Maps"}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              const text = `اسم العميل: ${order.customer_name}\nرقم الهاتف: ${order.phone}\nالمحافظة: ${order.governorate}\nالعنوان: ${order.address}\nرابط الموقع: https://www.google.com/maps?q=${order.latitude},${order.longitude}\nالمبلغ المطلوب: ${order.total} ج.م`;
                              navigator.clipboard.writeText(text);
                              toast.success(ar ? "تم نسخ تفاصيل الشحن والموقع" : "Shipping details copied");
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground bg-secondary px-2 py-0.5 rounded border border-border/40"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{ar ? "نسخ للشحن" : "Copy Courier Info"}</span>
                          </button>
                        </div>
                      )}

                      {/* Items */}
                      {items.length > 0 && (
                        <ul className="space-y-0.5 border-t border-border/40 pt-2">
                          {items.map((item) => (
                            <li key={item.id} className="text-xs text-foreground flex justify-between">
                              <span><span className="font-semibold">{item.title}</span> × {item.quantity}</span>
                              <span className="text-muted-foreground">{(item.price * item.quantity).toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Total + payment */}
                      <div className="flex items-center justify-between border-t border-border/40 pt-2">
                        <span className="text-xs text-muted-foreground uppercase">{order.payment_method}</span>
                        <span className="font-black text-primary text-sm">{order.total.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                      </div>

                      {/* Date */}
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString(ar ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                      </p>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 border-t border-border/40 pt-2">
                        {associatedReturn && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] px-3 font-bold border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 flex items-center gap-1 flex-1"
                            onClick={goToReturn}
                          >
                            <RotateCcw className="w-3 h-3" />
                            {ar ? "عرض الاسترجاع" : "View Return"}
                          </Button>
                        )}
                        {order.status !== "cancelled" && order.status !== "delivered" && order.status !== "returned" && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 text-[10px] px-3 font-semibold flex-1"
                              onClick={() => {
                                const nextStatus =
                                  order.status === "pending" ? "processing" :
                                    order.status === "processing" ? "shipped" : "delivered";
                                handleStatusChange(order.id, nextStatus);
                              }}
                            >
                              {order.status === "pending" ? (ar ? "تجهيز" : "Process") :
                                order.status === "processing" ? (ar ? "شحن" : "Ship") :
                                  (ar ? "توصيل" : "Deliver")}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-[10px] px-3 flex-1"
                              onClick={() => handleStatusChange(order.id, "cancelled")}
                            >
                              {ar ? "إلغاء" : "Cancel"}
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-[10px] px-3 flex items-center gap-1"
                          onClick={() => { setSelectedInvoiceOrder(order); setInvoiceModalOpen(true); }}
                        >
                          <ReceiptText className="w-3 h-3" />
                          {ar ? "فاتورة" : "Invoice"}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-[10px] px-3"
                          onClick={() => openActivityLog(order.id)}
                        >
                          {ar ? "النشاطات" : "Log"}
                        </Button>
                        {order.user_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] px-3 flex items-center gap-1"
                            onClick={() => openMessageModal(order.user_id!)}
                          >
                            <MessageSquare className="w-3 h-3" />
                            {ar ? "مراسلة" : "Msg"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── DESKTOP: Table layout ── */}
              <table className="hidden md:table w-full min-w-[980px] text-start border-collapse">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border text-xs font-bold text-muted-foreground text-start">
                    <th className="p-4 text-start">{ar ? "العميل" : "Customer"}</th>
                    <th className="p-4 text-start">{ar ? "المنتجات" : "Items"}</th>
                    <th className="p-4 text-start">{ar ? "التاريخ" : "Date"}</th>
                    <th className="p-4 text-start">{ar ? "إجمالي الفاتورة" : "Total"}</th>
                    <th className="p-4 text-start">{ar ? "الدفع / المنطقة" : "Payment / Area"}</th>
                    <th className="p-4 text-start">{ar ? "حالة الطلب" : "Status"}</th>
                    <th className="p-4 text-start">{ar ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {orders.map((order) => {
                    const items = orderItemsMap[order.id] || [];
                    const associatedReturn = returns.find((r) => r.order_id === order.id);
                    const goToReturn = () => {
                      setActiveTab("returns");
                      if (associatedReturn) setHighlightedReturnId(associatedReturn.id);
                      setHighlightedOrderId(order.id);
                      setTimeout(() => {
                        const el =
                          (associatedReturn && (document.getElementById(`admin-return-${associatedReturn.id}`) || document.getElementById(`admin-return-desktop-${associatedReturn.id}`))) ||
                          document.getElementById(`admin-return-${order.id}`) ||
                          document.getElementById(`admin-return-desktop-${order.id}`) ||
                          (document.querySelector(`[data-order-id="${order.id}"]`) as HTMLElement | null);
                        el?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }, 200);
                    };

                    return (
                      <tr
                        key={order.id}
                        id={`admin-order-desktop-${order.id}`}
                        data-order-id={order.id}
                        className={`hover:bg-secondary/10 align-top transition-all duration-500 ${
                          highlightedOrderId === order.id ? "bg-primary/10 ring-2 ring-primary" : ""
                        }`}
                      >
                        <td className="p-4">
                          <p className="font-bold text-foreground">{order.customer_name}</p>
                          {order.user_id && orderEmailsMap[order.user_id] && (
                            <p className="text-xs text-muted-foreground mt-0.5">{orderEmailsMap[order.user_id]}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">{order.phone}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] leading-relaxed">
                            {order.address}, {order.governorate}
                          </p>
                          {order.latitude && order.longitude && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              <a
                                href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline bg-primary/10 px-2 py-0.5 rounded"
                              >
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span>{ar ? "خريطة Google" : "Google Maps"}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  const text = `اسم العميل: ${order.customer_name}\nرقم الهاتف: ${order.phone}\nالمحافظة: ${order.governorate}\nالعنوان: ${order.address}\nرابط الموقع: https://www.google.com/maps?q=${order.latitude},${order.longitude}\nالمبلغ المطلوب: ${order.total} ج.م`;
                                  navigator.clipboard.writeText(text);
                                  toast.success(ar ? "تم نسخ تفاصيل الشحن والموقع" : "Shipping details copied");
                                }}
                                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground bg-secondary px-2 py-0.5 rounded border border-border/40"
                              >
                                <Copy className="w-3 h-3" />
                                <span>{ar ? "نسخ للشحن" : "Copy Info"}</span>
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {items.length > 0 ? (
                            <ul className="space-y-1">
                              {items.map((item) => (
                                <li key={item.id} className="text-xs text-foreground">
                                  <span className="font-semibold">{item.title}</span>
                                  <span className="text-muted-foreground"> × {item.quantity}</span>
                                  <span className="text-muted-foreground"> — {(item.price * item.quantity).toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString(ar ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </td>
                        <td className="p-4 font-black text-primary">
                          <div>{order.total.toFixed(2)} {ar ? "ج.م" : "EGP"}</div>
                          <div className="text-[11px] font-normal text-muted-foreground space-y-0.5 mt-1.5 border-t border-border/40 pt-1">
                            <div className="flex justify-between gap-2">
                              <span>{ar ? "المجموع الفرعي:" : "Subtotal:"}</span>
                              <span>{(order.subtotal || (order.total - order.shipping_cost + order.discount + (order.wallet_used || 0))).toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span>{ar ? "مصاريف الشحن:" : "Shipping:"}</span>
                              <span>{order.shipping_cost.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                            </div>
                            {order.discount > 0 && (
                              <div className="flex justify-between gap-2 text-green-600">
                                <span>{ar ? "خصم:" : "Discount:"}</span>
                                <span>- {order.discount.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                              </div>
                            )}
                            {order.wallet_used > 0 && (
                              <div className="flex justify-between gap-2 text-blue-600 font-semibold">
                                <span>{ar ? "مدفوع من المحفظة:" : "Wallet Applied:"}</span>
                                <span>- {order.wallet_used.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                              </div>
                            )}
                            <div className="flex justify-between gap-2 font-bold text-foreground border-t border-border/30 pt-0.5 mt-0.5">
                              <span>{ar ? "المطلوب دفعه:" : "Amount Due:"}</span>
                              <span>{order.total.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground text-xs uppercase tracking-wider">
                          {order.payment_method}
                        </td>
                        <td className="p-4">
                          {associatedReturn ? (
                            <button
                              type="button"
                              onClick={goToReturn}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 transition cursor-pointer"
                              title={ar ? "انتقال إلى طلب الاسترجاع" : "Go to Return Request"}
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{ar ? "طلب استرجاع" : "Return Request"}</span>
                            </button>
                          ) : order.status === "cancelled" ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              {ar ? "ملغي" : "Cancelled"}
                            </span>
                          ) : order.status === "delivered" ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                              {ar ? "تم التوصيل" : "Delivered"}
                            </span>
                          ) : order.status === "returned" ? (
                            <button
                              type="button"
                              onClick={goToReturn}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 transition cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{ar ? "مُرتجع" : "Returned"}</span>
                            </button>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 text-[10px] px-2 flex-1 font-semibold"
                                  onClick={() => {
                                    const nextStatus =
                                      order.status === "pending" ? "processing" :
                                        order.status === "processing" ? "shipped" :
                                          "delivered";
                                    handleStatusChange(order.id, nextStatus);
                                  }}
                                >
                                  {order.status === "pending" ? (ar ? "تجهيز الطلب" : "Process") :
                                    order.status === "processing" ? (ar ? "شحن الطلب" : "Ship") :
                                      (ar ? "توصيل الطلب" : "Deliver")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 text-[10px] px-2 flex-1 font-semibold"
                                  onClick={() => handleStatusChange(order.id, "cancelled")}
                                >
                                  {ar ? "إلغاء" : "Cancel"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-start">
                          <div className="flex flex-col gap-2">
                            {associatedReturn && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 flex items-center justify-center gap-1.5 border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold"
                                onClick={goToReturn}
                              >
                                <RotateCcw className="w-3 h-3" />
                                {ar ? "عرض الاسترجاع" : "View Return"}
                              </Button>
                            )}
                            <Button
                              variant="default"
                              size="sm"
                              className="text-xs h-7 flex items-center gap-1.5"
                              onClick={() => {
                                setSelectedInvoiceOrder(order);
                                setInvoiceModalOpen(true);
                              }}
                            >
                              <ReceiptText className="w-3 h-3" />
                              {ar ? "الفاتورة" : "Invoice"}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => openActivityLog(order.id)}
                            >
                              {ar ? "سجل النشاطات" : "Activity Log"}
                            </Button>
                            {order.user_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs flex items-center justify-center gap-1.5 h-7"
                                onClick={() => openMessageModal(order.user_id!)}
                              >
                                <MessageSquare className="w-3 h-3" />
                                {ar ? "مراسلة" : "Message"}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              {/* ── MOBILE: Card layout ── */}
              <div className="md:hidden divide-y divide-border">
                {returns.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">{ar ? "لا توجد طلبات إرجاع" : "No return requests"}</p>
                ) : returns.map((ret: any) => {
                  const retItems = orderItemsMap[ret.order_id] || [];
                  const displayItems = ret.returned_items && ret.returned_items.length > 0 ? ret.returned_items : retItems;
                  const statusMap: Record<string, string> = {
                    pending: ar ? "قيد المراجعة" : "Pending",
                    approved: ar ? "تمت الموافقة" : "Approved",
                    received: ar ? "تم الاستلام" : "Received",
                    completed: ar ? "مكتمل" : "Completed",
                    rejected: ar ? "مرفوض" : "Rejected",
                    cancelled: ar ? "ملغى" : "Cancelled",
                    reopened: ar ? "مُعاد فتحه" : "Reopened",
                  };
                  const statusColor: Record<string, string> = {
                    completed: "bg-green-100 text-green-700",
                    approved: "bg-emerald-100 text-emerald-700",
                    received: "bg-blue-100 text-blue-700",
                    rejected: "bg-red-100 text-red-700",
                    cancelled: "bg-gray-100 text-gray-700",
                    reopened: "bg-orange-100 text-orange-700",
                    pending: "bg-yellow-100 text-yellow-700",
                  };
                  return (
                    <div
                      key={ret.id}
                      id={`admin-return-${ret.id}`}
                      data-return-id={ret.id}
                      data-order-id={ret.order_id}
                      className={`p-4 space-y-3 transition-all duration-500 ${
                        highlightedReturnId === ret.id || highlightedOrderId === ret.order_id || highlightedOrderId === ret.id
                          ? "bg-primary/10 ring-2 ring-primary border border-primary shadow-lg rounded-xl"
                          : ""
                      }`}
                    >
                      {/* Header: customer + status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-foreground text-sm">{ret.profiles?.name || ret.orders?.customer_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{ret.profiles?.email || "—"}</p>
                          {ret.orders?.phone && <p className="text-xs text-muted-foreground">{ret.orders.phone}</p>}
                        </div>
                        <span className={`shrink-0 inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor[ret.status] || "bg-yellow-100 text-yellow-700"}`}>
                          {statusMap[ret.status] ?? ret.status}
                        </span>
                      </div>

                      {/* Items */}
                      {displayItems.length > 0 && (
                        <ul className="space-y-0.5 border-t border-border/40 pt-2">
                          {displayItems.map((item: any) => (
                            <li key={item.id || item.item_id} className="text-xs text-foreground flex justify-between">
                              <span><span className="font-semibold">{item.title}</span> × {item.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Reason + images */}
                      <div className="border-t border-border/40 pt-2 space-y-2">
                        <p className="text-xs text-muted-foreground">{ret.reason}</p>
                        {ret.images && ret.images.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {ret.images.map((url: string, idx: number) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt={`img-${idx + 1}`} className="w-12 h-12 object-cover rounded border border-border" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Refund amount */}
                      <div className="flex items-center justify-between border-t border-border/40 pt-2">
                        <span className="text-xs text-muted-foreground">{ar ? "المبلغ المسترد:" : "Refund:"}</span>
                        <span className="font-black text-primary text-sm">{ret.refund_amount.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 border-t border-border/40 pt-2">
                        {ret.status === "pending" && (
                          <>
                            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] h-7 px-3 flex-1" onClick={() => handleUpdateReturnStatus(ret, "approved")}>
                              {ar ? "قبول" : "Approve"}
                            </Button>
                            <Button size="sm" variant="destructive" className="text-[10px] h-7 px-3 flex-1" onClick={() => { setSelectedReturnToReject(ret); setRejectModalOpen(true); }}>
                              {ar ? "رفض" : "Reject"}
                            </Button>
                          </>
                        )}
                        {ret.status === "approved" && (
                          <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700 text-[10px] h-7 px-3 flex-1" onClick={() => openReceiveModal(ret)}>
                            {ar ? "تأكيد الاستلام" : "Mark Received"}
                          </Button>
                        )}
                        {ret.status === "received" && (
                          <>
                            <Button size="sm" className="bg-green-600 text-white hover:bg-green-700 text-[10px] h-7 px-3 flex-1" onClick={() => handleUpdateReturnStatus(ret, "completed")}>
                              {ar ? "رد المبلغ" : "Complete & Refund"}
                            </Button>
                            <Button size="sm" variant="outline" className="text-[10px] h-7 px-3" onClick={() => openReceiveModal(ret)}>
                              {ar ? "تعديل" : "Edit"}
                            </Button>
                          </>
                        )}
                        {ret.status === "rejected" && (
                          <Button size="sm" variant="outline" className="text-[10px] h-7 px-3 flex-1" onClick={() => handleUpdateReturnStatus(ret, "reopened")}>
                            {ar ? "إعادة فتح" : "Reopen"}
                          </Button>
                        )}
                        {(ret.status === "approved" || ret.status === "received") && (
                          <Button size="sm" variant="outline" className="text-[10px] h-7 px-3 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleUpdateReturnStatus(ret, "cancelled")}>
                            {ar ? "إلغاء" : "Cancel"}
                          </Button>
                        )}
                        {ret.user_id && (
                          <Button size="sm" variant="outline" className="text-[10px] h-7 px-3 flex items-center gap-1" onClick={() => openMessageModal(ret.user_id)}>
                            <MessageSquare className="w-3 h-3" />
                            {ar ? "مراسلة" : "Msg"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── DESKTOP: Table layout ── */}
              <table className="hidden md:table w-full min-w-[980px] text-start border-collapse">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border text-xs font-bold text-muted-foreground text-start">
                    <th className="p-4 text-start">{ar ? "العميل" : "Customer"}</th>
                    <th className="p-4 text-start">{ar ? "المنتجات" : "Items"}</th>
                    <th className="p-4 text-start">{ar ? "السبب" : "Reason"}</th>
                    <th className="p-4 text-start">{ar ? "المبلغ المسترد" : "Refund"}</th>
                    <th className="p-4 text-start">{ar ? "الحالة" : "Status"}</th>
                    <th className="p-4 text-start">{ar ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {returns.map((ret: any) => {
                    const retItems = orderItemsMap[ret.order_id] || [];
                    return (
                      <tr
                        key={ret.id}
                        id={`admin-return-desktop-${ret.id}`}
                        data-return-id={ret.id}
                        data-order-id={ret.order_id}
                        className={`hover:bg-secondary/10 align-top transition-all duration-500 ${
                          highlightedReturnId === ret.id || highlightedOrderId === ret.order_id || highlightedOrderId === ret.id
                            ? "bg-primary/10 ring-2 ring-primary"
                            : ""
                        }`}
                      >
                        <td className="p-4">
                          <p className="font-bold text-foreground">{ret.profiles?.name || ret.orders?.customer_name || "—"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{ret.profiles?.email || "—"}</p>
                          <p className="text-xs text-muted-foreground">{ret.orders?.phone || ""}</p>
                        </td>
                        <td className="p-4">
                          {(ret.returned_items && ret.returned_items.length > 0 ? ret.returned_items : retItems).length > 0 ? (
                            <ul className="space-y-1">
                              {(ret.returned_items && ret.returned_items.length > 0 ? ret.returned_items : retItems).map((item: any) => (
                                <li key={item.id || item.item_id} className="text-xs text-foreground">
                                  <span className="font-semibold">{item.title}</span>
                                  <span className="text-muted-foreground"> × {item.quantity}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground text-xs max-w-[200px]">
                          <p className="mb-2">{ret.reason}</p>
                          {ret.images && ret.images.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {ret.images.map((url: string, idx: number) => (
                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                  <img src={url} alt={`return-img-${idx + 1}`} className="w-12 h-12 object-cover rounded border border-border hover:opacity-80 transition-opacity cursor-pointer" />
                                </a>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-black text-primary">
                          {ret.refund_amount.toFixed(2)} {ar ? "ج.م" : "EGP"}
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${ret.status === "completed" ? "bg-green-100 text-green-700" :
                              ret.status === "approved" ? "bg-emerald-100 text-emerald-700" :
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
                              cancelled: ar ? "ملغى" : "Cancelled",
                            }[ret.status as string] ?? ret.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-2 mb-2">
                            {ret.status === "pending" && (
                              <>
                                <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs" onClick={() => handleUpdateReturnStatus(ret, "approved")}>
                                  {ar ? "قبول" : "Approve"}
                                </Button>
                                <Button size="sm" variant="destructive" className="text-xs" onClick={() => { setSelectedReturnToReject(ret); setRejectModalOpen(true); }}>
                                  {ar ? "رفض" : "Reject"}
                                </Button>
                              </>
                            )}
                            {ret.status === "approved" && (
                              <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700 text-xs" onClick={() => openReceiveModal(ret)}>
                                {ar ? "تأكيد الاستلام" : "Mark Received"}
                              </Button>
                            )}
                            {ret.status === "received" && (
                              <>
                                <Button size="sm" className="bg-green-600 text-white hover:bg-green-700 text-xs" onClick={() => handleUpdateReturnStatus(ret, "completed")}>
                                  {ar ? "إكمال ورد المبلغ" : "Complete & Refund"}
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs" onClick={() => openReceiveModal(ret)}>
                                  {ar ? "تعديل الاستلام" : "Edit Received"}
                                </Button>
                              </>
                            )}
                            {ret.status === "rejected" && (
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => handleUpdateReturnStatus(ret, "reopened")}>
                                {ar ? "إعادة فتح للعميل" : "Reopen for Customer"}
                              </Button>
                            )}
                            {(ret.status === "approved" || ret.status === "received") && (
                              <Button size="sm" variant="outline" className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 mt-1" onClick={() => handleUpdateReturnStatus(ret, "cancelled")}>
                                {ar ? "إلغاء الطلب" : "Cancel Return"}
                              </Button>
                            )}
                          </div>
                          {ret.user_id && (
                            <Button variant="outline" size="sm" className="text-xs flex items-center gap-2" onClick={() => openMessageModal(ret.user_id)}>
                              <MessageSquare className="w-3.5 h-3.5" />
                              {ar ? "مراسلة" : "Message"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminLayout>

      <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ar ? "إرسال رسالة شات للعميل" : "Send Chat Message to Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">{ar ? "نص الرسالة" : "Message Body"}</label>
              <Textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder={ar ? "اكتب رسالتك هنا للعميل بخصوص الطلب..." : "Type your message here..."}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageModalOpen(false)}>
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSendMessage} disabled={!messageBody || sendingMessage}>
              {sendingMessage ? (ar ? "جاري الإرسال..." : "Sending...") : (ar ? "إرسال" : "Send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ar ? "سبب الرفض" : "Rejection Reason"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">{ar ? "يرجى كتابة سبب رفض الطلب بوضوح" : "Please provide a clear reason for rejection"}</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={ar ? "المنتج لا يطابق سياسة الاسترجاع..." : "Product does not meet return conditions..."}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectModalOpen(false); setRejectionReason(""); }}>
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedReturnToReject && handleUpdateReturnStatus(selectedReturnToReject, "rejected", rejectionReason)}
              disabled={!rejectionReason.trim()}
            >
              {ar ? "تأكيد الرفض" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Items Modal */}
      <Dialog open={receivedModalOpen} onOpenChange={setReceivedModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ar ? "تأكيد استلام المنتجات" : "Confirm Received Items"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {ar ? "الرجاء تحديد الكمية الفعلية التي تم استلامها من العميل لكل منتج:" : "Please specify the actual quantity received from the customer for each item:"}
            </p>
            <div className="space-y-3 max-h-[40vh] overflow-y-auto">
              {selectedReturnToReceive?.returned_items?.map((item) => (
                <div key={item.item_id} className="flex items-center justify-between bg-secondary/20 p-3 rounded-md border border-border">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{ar ? `مطلوب استرجاع: ${item.quantity}` : `Requested: ${item.quantity}`}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setAdminReceivedItems(prev => ({ ...prev, [item.item_id]: Math.max(0, (prev[item.item_id] || 0) - 1) }))}
                    >
                      -
                    </Button>
                    <span className="font-bold text-sm min-w-4 text-center">{adminReceivedItems[item.item_id] || 0}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        const originalOrderQty = orderItemsMap[selectedReturnToReceive?.order_id || ""]?.find(oi => oi.id === item.item_id)?.quantity || item.quantity;
                        setAdminReceivedItems(prev => ({ ...prev, [item.item_id]: Math.min(originalOrderQty, (prev[item.item_id] || 0) + 1) }));
                      }}
                    >
                      +
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReceivedModalOpen(false); setSelectedReturnToReceive(null); }}>
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={submitReceivedItems}>
              {ar ? "حفظ وتأكيد" : "Save & Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Modal */}
      <Dialog open={activityModalOpen} onOpenChange={setActivityModalOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ar ? "سجل نشاطات الطلب" : "Order Activity Log"}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {loadingActivity ? (
              <p className="text-muted-foreground">{ar ? "جاري التحميل..." : "Loading..."}</p>
            ) : selectedOrderActivity.length === 0 ? (
              <p className="text-muted-foreground">{ar ? "لا يوجد سجل نشاطات لهذا الطلب." : "No activity logged for this order."}</p>
            ) : (
              <div className="relative border-s border-border ml-3 ar:mr-3 ar:ml-0 space-y-6">
                {selectedOrderActivity.map((act) => (
                  <div key={act.id} className="mb-6 ms-6 relative">
                    <span className="absolute flex items-center justify-center w-3 h-3 bg-primary rounded-full -start-7 top-1 ring-4 ring-background"></span>
                    <h3 className="flex items-center mb-1 text-sm font-semibold text-foreground">
                      {ar ? act.description_ar : act.description_en}
                    </h3>
                    <time className="block mb-2 text-xs font-normal leading-none text-muted-foreground">
                      {new Date(act.created_at).toLocaleString(ar ? "ar-EG" : "en-US")}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
                          }, 350);
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
    </AdminGuard>
  );
}

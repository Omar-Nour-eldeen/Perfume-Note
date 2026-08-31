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
import { MessageSquare, ReceiptText, Printer } from "lucide-react";
import type { Order, OrderItem, ReturnRequest } from "@/lib/types";
import { toast } from "sonner";
import { createNotification } from "@/lib/notifications";

export const Route = createFileRoute("/admin/orders")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string) || "orders",
  }),
  component: AdminOrders,
});

function AdminOrders() {
  const { language } = useI18n();
  const ar = language === "ar";
  const { tab } = Route.useSearch();
  const [orders, setOrders] = useState<Order[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "returns">(tab === "returns" ? "returns" : "orders");
  const [loading, setLoading] = useState(true);
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, OrderItem[]>>({});
  const [orderEmailsMap, setOrderEmailsMap] = useState<Record<string, string>>({});

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
          pending:    { ar: "قيد الانتظار",  en: "Pending" },
          processing: { ar: "جاري التجهيز", en: "Processing" },
          shipped:    { ar: "تم الشحن",      en: "Shipped" },
          delivered:  { ar: "تم التوصيل",   en: "Delivered" },
          cancelled:  { ar: "ملغي",          en: "Cancelled" },
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
          link: "/account",
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
          link: "/account",
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
        link: "/account",
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
        type: "system",
        title_ar: "رسالة جديدة من الدعم",
        title_en: "New message from support",
        body_ar: messageBody,
        body_en: messageBody,
        link: "", // Assuming the chat widget is accessible globally, they can just open it
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
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${
                activeTab === "orders" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              {ar ? "طلبات العملاء" : "Customer Orders"}
            </button>
            <button
              onClick={() => setActiveTab("returns")}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${
                activeTab === "returns" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              {ar ? "طلبات الاسترجاع" : "Return Requests"}
            </button>
          </div>

          {loading ? (
            <span className="text-muted-foreground">{ar ? "جاري التحميل..." : "Loading..."}</span>
          ) : activeTab === "orders" ? (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border text-xs font-bold text-muted-foreground text-start">
                    <th className="p-4 text-start">{ar ? "العميل" : "Customer"}</th>
                    <th className="p-4 text-start">{ar ? "المنتجات" : "Items"}</th>
                    <th className="p-4 text-start">{ar ? "إجمالي الفاتورة" : "Total"}</th>
                    <th className="p-4 text-start">{ar ? "الدفع / المنطقة" : "Payment / Area"}</th>
                    <th className="p-4 text-start">{ar ? "حالة الطلب" : "Status"}</th>
                    <th className="p-4 text-start">{ar ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {orders.map((order) => {
                    const items = orderItemsMap[order.id] || [];
                    return (
                      <tr key={order.id} className="hover:bg-secondary/10 align-top">
                        <td className="p-4">
                          <p className="font-bold text-foreground">{order.customer_name}</p>
                          {order.user_id && orderEmailsMap[order.user_id] && (
                            <p className="text-xs text-muted-foreground mt-0.5">{orderEmailsMap[order.user_id]}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">{order.phone}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] leading-relaxed">
                            {order.address}, {order.governorate}
                          </p>
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
                        <td className="p-4 font-black text-primary min-w-[170px]">
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
                          {order.status === "cancelled" ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              {ar ? "ملغي" : "Cancelled"}
                            </span>
                          ) : order.status === "delivered" ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                              {ar ? "تم التوصيل" : "Delivered"}
                            </span>
                          ) : order.status === "returned" ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                              {ar ? "مُرتجع" : "Returned"}
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1.5 min-w-[140px]">
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
              <table className="w-full text-start border-collapse">
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
                      <tr key={ret.id} className="hover:bg-secondary/10 align-top">
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
                                  <img
                                    src={url}
                                    alt={`return-img-${idx + 1}`}
                                    className="w-12 h-12 object-cover rounded border border-border hover:opacity-80 transition-opacity cursor-pointer"
                                  />
                                </a>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-black text-primary">
                          {ret.refund_amount.toFixed(2)} {ar ? "ج.م" : "EGP"}
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            ret.status === "completed" ? "bg-green-100 text-green-700" :
                            ret.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                            ret.status === "received" ? "bg-blue-100 text-blue-700" :
                            ret.status === "rejected" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {{
                              pending:  ar ? "قيد المراجعة" : "Pending",
                              approved: ar ? "تمت الموافقة" : "Approved",
                              received: ar ? "تم الاستلام" : "Received",
                              completed: ar ? "مكتمل" : "Completed",
                              rejected: ar ? "مرفوض"       : "Rejected",
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
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs flex items-center gap-2"
                              onClick={() => openMessageModal(ret.user_id)}
                            >
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
              <div className="flex justify-between items-start mb-8 border-b pb-6">
                <div>
                  <h1 className="text-2xl font-black text-primary mb-1">Perfume Note</h1>
                  <p className="text-sm text-gray-500">{ar ? "رقم الطلب:" : "Order #"} {selectedInvoiceOrder.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-sm text-gray-500">{new Date(selectedInvoiceOrder.created_at).toLocaleString(ar ? "ar-EG" : "en-US")}</p>
                </div>
                <div className="text-end">
                  <h3 className="font-bold mb-1">{ar ? "بيانات العميل" : "Customer Details"}</h3>
                  <p className="text-sm">{selectedInvoiceOrder.customer_name}</p>
                  <p className="text-sm">{selectedInvoiceOrder.phone}</p>
                  <p className="text-sm">{selectedInvoiceOrder.address}, {selectedInvoiceOrder.governorate}</p>
                </div>
              </div>
              
              <table className="w-full text-start mb-8 border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="py-2 text-start">{ar ? "المنتج" : "Item"}</th>
                    <th className="py-2 text-center">{ar ? "الكمية" : "Qty"}</th>
                    <th className="py-2 text-end">{ar ? "السعر" : "Price"}</th>
                    <th className="py-2 text-end">{ar ? "الإجمالي" : "Total"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orderItemsMap[selectedInvoiceOrder.id]?.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 text-sm">{item.title}</td>
                      <td className="py-3 text-sm text-center">{item.quantity}</td>
                      <td className="py-3 text-sm text-end">{item.price.toFixed(2)} {ar ? "ج.م" : "EGP"}</td>
                      <td className="py-3 text-sm text-end font-semibold">{(item.price * item.quantity).toFixed(2)} {ar ? "ج.م" : "EGP"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{ar ? "المجموع الفرعي:" : "Subtotal:"}</span>
                    <span>{(selectedInvoiceOrder.subtotal || (selectedInvoiceOrder.total - selectedInvoiceOrder.shipping_cost + selectedInvoiceOrder.discount + (selectedInvoiceOrder.wallet_used || 0))).toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{ar ? "مصاريف الشحن:" : "Shipping:"}</span>
                    <span>{selectedInvoiceOrder.shipping_cost.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                  </div>
                  {selectedInvoiceOrder.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>{ar ? "خصم:" : "Discount:"}</span>
                      <span>- {selectedInvoiceOrder.discount.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                    </div>
                  )}
                  {selectedInvoiceOrder.wallet_used > 0 && (
                    <div className="flex justify-between text-blue-600 font-bold">
                      <span>{ar ? "مدفوع من المحفظة:" : "Wallet Applied:"}</span>
                      <span>- {selectedInvoiceOrder.wallet_used.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-2 font-black text-lg">
                    <span>{ar ? "المطلوب دفعه:" : "Amount Due:"}</span>
                    <span>{selectedInvoiceOrder.total.toFixed(2)} {ar ? "ج.م" : "EGP"}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{ar ? "طريقة الدفع:" : "Payment Method:"}</span>
                    <span className="uppercase">{selectedInvoiceOrder.payment_method}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setInvoiceModalOpen(false)}>
              {ar ? "إغلاق" : "Close"}
            </Button>
            <Button onClick={() => {
              const content = document.getElementById("invoice-content")?.innerHTML;
              const printWindow = window.open("", "_blank");
              if (printWindow) {
                printWindow.document.write(`
                  <html dir="${ar ? 'rtl' : 'ltr'}">
                    <head>
                      <title>${ar ? 'طباعة الفاتورة' : 'Print Invoice'}</title>
                      <style>
                        body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
                        th { border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; text-align: ${ar ? 'right' : 'left'}; }
                        td { border-bottom: 1px solid #f3f4f6; padding: 0.75rem 0; }
                        .text-end { text-align: ${ar ? 'left' : 'right'}; }
                        .text-center { text-align: center; }
                        .flex { display: flex; }
                        .justify-between { justify-content: space-between; }
                        .justify-end { justify-content: flex-end; }
                        .font-bold { font-weight: bold; }
                        .font-black { font-weight: 900; }
                        .text-primary { color: #000; }
                        .text-gray-500 { color: #6b7280; }
                        .text-gray-600 { color: #4b5563; }
                        .text-green-600 { color: #16a34a; }
                        .text-blue-600 { color: #2563eb; }
                        .text-2xl { font-size: 1.5rem; }
                        .text-lg { font-size: 1.125rem; }
                        .text-sm { font-size: 0.875rem; }
                        .text-xs { font-size: 0.75rem; }
                        .border-b { border-bottom: 1px solid #e5e7eb; }
                        .pb-6 { padding-bottom: 1.5rem; }
                        .mb-8 { margin-bottom: 2rem; }
                        .mb-1 { margin-bottom: 0.25rem; }
                        .space-y-2 > * + * { margin-top: 0.5rem; }
                        .pt-2 { padding-top: 0.5rem; }
                        .w-64 { width: 16rem; }
                      </style>
                    </head>
                    <body>
                      ${content}
                      <script>
                        window.onload = () => {
                          window.print();
                          window.close();
                        };
                      </script>
                    </body>
                  </html>
                `);
                printWindow.document.close();
              }
            }}>
              <Printer className="w-4 h-4 mr-2 ml-2" />
              {ar ? "طباعة" : "Print"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminGuard>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChatMessage, Profile, Order } from "@/lib/types";
import { Send, User, Phone, Mail, ShoppingBag, Clock, Package } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/chat")({
  component: AdminChat,
});

interface SessionInfo {
  sessionId: string;
  userId: string | null;
  lastMessage: string;
  lastTime: string;
}

interface CustomerInfo {
  profile: Profile | null;
  orders: Order[];
}

function AdminChat() {
  const { language } = useI18n();
  const ar = language === "ar";
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchActiveSessions();

    const channel = supabase
      .channel("admin-chat-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;

          // Refresh sessions list
          fetchActiveSessions();

          if (activeSession && newMsg.session_id === activeSession) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              // Remove temporary optimistic message with same content
              const filtered = prev.filter(m => !(m.id.startsWith('temp-') && m.message === newMsg.message));
              return [...filtered, newMsg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchActiveSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("session_id, sender_id, message, created_at, is_admin")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Build unique sessions with last message info
      const sessionMap = new Map<string, SessionInfo>();
      for (const msg of data || []) {
        if (!sessionMap.has(msg.session_id)) {
          // Extract user ID from session_id pattern "user_<uuid>"
          const userId = msg.session_id.startsWith("user_")
            ? msg.session_id.replace("user_", "")
            : (msg.sender_id || null);

          sessionMap.set(msg.session_id, {
            sessionId: msg.session_id,
            userId,
            lastMessage: msg.message,
            lastTime: msg.created_at,
          });
        }
      }
      setSessions(Array.from(sessionMap.values()));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSessionMessages = async (session: SessionInfo) => {
    setActiveSession(session.sessionId);
    setCustomerInfo(null);

    try {
      // Fetch messages
      const { data: msgs, error: msgErr } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", session.sessionId)
        .order("created_at", { ascending: true });

      if (msgErr) throw msgErr;
      setMessages((msgs as ChatMessage[]) || []);

      // Fetch customer profile and orders if we have a user ID
      if (session.userId) {
        const [profileRes, ordersRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("id", session.userId)
            .single(),
          supabase
            .from("orders")
            .select("*")
            .eq("user_id", session.userId)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        setCustomerInfo({
          profile: (profileRes.data as Profile) || null,
          orders: (ordersRes.data as Order[]) || [],
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeSession) return;

    const messageId = crypto.randomUUID();
    
    // Extract client ID from the session to bypass RLS select policies on the client side
    const clientId = activeSession.startsWith("user_") ? activeSession.replace("user_", "") : null;

    const payload = {
      id: messageId,
      sender_id: clientId,
      session_id: activeSession,
      message: input,
      is_admin: true,
    };

    // Optimistic update
    const optimisticMsg: ChatMessage = {
      ...payload,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    setInput("");

    const { error } = await supabase.from("chat_messages").insert(payload);
    if (error) {
      console.error(error);
      toast.error(ar ? "فشل إرسال الرسالة: " + error.message : "Failed to send: " + error.message);
      setMessages((prev) => prev.filter(m => m.id !== messageId));
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600",
    processing: "bg-blue-500/10 text-blue-600",
    shipped: "bg-purple-500/10 text-purple-600",
    delivered: "bg-green-500/10 text-green-600",
    cancelled: "bg-red-500/10 text-red-600",
    returned: "bg-orange-500/10 text-orange-600",
  };

  const statusLabel: Record<string, { ar: string; en: string }> = {
    pending: { ar: "معلق", en: "Pending" },
    processing: { ar: "قيد المعالجة", en: "Processing" },
    shipped: { ar: "تم الشحن", en: "Shipped" },
    delivered: { ar: "تم التسليم", en: "Delivered" },
    cancelled: { ar: "ملغي", en: "Cancelled" },
    returned: { ar: "مرتجع", en: "Returned" },
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6 h-[calc(100vh-10rem)] flex flex-col">
          <div>
            <h1 className="text-2xl font-black text-foreground">
              {ar ? "محادثات الدعم" : "Support Chats"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {ar ? "الرد على استفسارات ومحادثات العملاء مباشرةً" : "Answer customer live inquiries directly"}
            </p>
          </div>

          <div className="flex-1 flex border border-border bg-card rounded-2xl overflow-hidden min-h-0">
            {/* Session Sidebar */}
            <div className="w-56 border-e border-border overflow-y-auto flex-shrink-0">
              <div className="p-3 border-b border-border bg-secondary/10">
                <span className="font-bold text-xs text-muted-foreground">
                  {ar ? "المحادثات" : "Chats"}
                </span>
              </div>
              <div className="divide-y divide-border/60">
                {sessions.length === 0 && (
                  <p className="p-4 text-xs text-muted-foreground text-center">
                    {ar ? "لا توجد محادثات" : "No chats yet"}
                  </p>
                )}
                {sessions.map((session) => (
                  <button
                    key={session.sessionId}
                    onClick={() => fetchSessionMessages(session)}
                    className={`w-full text-start p-3 transition hover:bg-secondary/40 ${
                      activeSession === session.sessionId ? "bg-primary/5 border-s-2 border-primary" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className={`text-xs font-bold truncate ${activeSession === session.sessionId ? "text-primary" : "text-foreground/80"}`}>
                        {session.userId ? session.userId.slice(0, 8) + "..." : session.sessionId.slice(0, 8) + "..."}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate ps-9">
                      {session.lastMessage}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 flex flex-col min-w-0 bg-secondary/5">
              {activeSession ? (
                <>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((msg) => {
                      const isMe = msg.is_admin;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                              isMe
                                ? "bg-primary text-white rounded-br-none"
                                : "bg-card border border-border text-foreground rounded-bl-none"
                            }`}
                          >
                            <p className="leading-relaxed">{msg.message}</p>
                            <p className={`text-[10px] mt-1 ${isMe ? "text-white/60" : "text-muted-foreground"}`}>
                              {new Date(msg.created_at).toLocaleTimeString(ar ? "ar-EG" : "en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleSend} className="p-4 border-t border-border bg-card flex gap-2">
                    <Input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={ar ? "اكتب ردك هنا..." : "Type your reply here..."}
                      className="flex-1 bg-background"
                    />
                    <Button type="submit" className="bg-primary text-white">
                      <Send className="h-4 w-4 me-2" />
                      {ar ? "إرسال" : "Send"}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  {ar ? "اختر محادثة من القائمة للبدء" : "Select a conversation from the list to begin"}
                </div>
              )}
            </div>

            {/* Customer Info Panel */}
            {activeSession && (
              <div className="w-64 border-s border-border overflow-y-auto flex-shrink-0 bg-background">
                <div className="p-3 border-b border-border bg-secondary/10">
                  <span className="font-bold text-xs text-muted-foreground">
                    {ar ? "بيانات العميل" : "Customer Info"}
                  </span>
                </div>

                {customerInfo ? (
                  <div className="p-4 space-y-5">
                    {/* Profile */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {customerInfo.profile?.avatar_url ? (
                            <img src={customerInfo.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">
                            {customerInfo.profile?.name || (ar ? "غير محدد" : "Unknown")}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {ar ? "عميل مسجل" : "Registered customer"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {customerInfo.profile?.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-foreground/80 truncate">
                              {customerInfo.profile.email}
                            </span>
                          </div>
                        )}
                        {customerInfo.profile?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-foreground/80">
                              {customerInfo.profile.phone}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">
                            {ar ? "منذ " : "Since "}
                            {new Date(customerInfo.profile?.created_at || "").toLocaleDateString(
                              ar ? "ar-EG" : "en-US",
                              { month: "short", year: "numeric" }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border/50 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-bold text-foreground">
                          {ar ? "آخر الطلبات" : "Recent Orders"}
                        </span>
                      </div>
                      {customerInfo.orders.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {ar ? "لا توجد طلبات سابقة" : "No orders yet"}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {customerInfo.orders.map((order) => (
                            <div
                              key={order.id}
                              className="bg-secondary/30 rounded-lg p-2.5 space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1">
                                  <Package className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-[11px] font-bold text-foreground">
                                    #{order.id.slice(0, 6)}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusColors[order.status] || "bg-secondary text-muted-foreground"}`}>
                                  {ar ? statusLabel[order.status]?.ar : statusLabel[order.status]?.en}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-primary font-bold">
                                  {order.total.toFixed(2)} {ar ? "ج.م" : "EGP"}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(order.created_at).toLocaleDateString(
                                    ar ? "ar-EG" : "en-US",
                                    { day: "numeric", month: "short" }
                                  )}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground text-xs">
                    {ar ? "جاري تحميل بيانات العميل..." : "Loading customer info..."}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}

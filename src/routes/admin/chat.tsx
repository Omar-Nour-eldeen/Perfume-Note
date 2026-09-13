import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChatMessage, Profile, Order } from "@/lib/types";
import { Send, User, Phone, Mail, ShoppingBag, Clock, Package, ArrowLeft, ArrowRight, Info, Search, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { createNotification } from "@/lib/notifications";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/chat")({
  validateSearch: (search: Record<string, unknown>): { sessionId?: string } => {
    return search["sessionId"] ? { sessionId: search["sessionId"] as string } : {};
  },
  component: AdminChat,
});

interface SessionInfo {
  sessionId: string;
  userId: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerAvatar?: string | null;
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
  const { sessionId } = Route.useSearch();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [showMobileCustomerInfo, setShowMobileCustomerInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSessionRef = useRef<string | null>(null);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  const loadSessionData = async (targetSessionId: string) => {
    setActiveSession(targetSessionId);
    setCustomerInfo(null);

    try {
      // Fetch messages
      const { data: msgs, error: msgErr } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", targetSessionId)
        .order("created_at", { ascending: true });

      if (msgErr) throw msgErr;
      setMessages((msgs as ChatMessage[]) || []);

      // Extract user ID from session_id pattern "user_<uuid>"
      const userId = targetSessionId.startsWith("user_")
        ? targetSessionId.replace("user_", "")
        : null;

      if (userId) {
        const [profileRes, ordersRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle(),
          supabase
            .from("orders")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        setCustomerInfo({
          profile: (profileRes.data as Profile) || null,
          orders: (ordersRes.data as Order[]) || [],
        });
      } else {
        setCustomerInfo({
          profile: null,
          orders: [],
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load session from search query param (from notifications)
  useEffect(() => {
    if (sessionId) {
      loadSessionData(sessionId);
    }
  }, [sessionId]);

  // Initial load auto-select first session ONLY on desktop if no session selected
  useEffect(() => {
    if (!sessionId && sessions.length > 0 && !activeSession && window.innerWidth >= 768) {
      loadSessionData(sessions[0].sessionId);
    }
  }, [sessions, sessionId, activeSession]);

  // Listen for notification click events to open a specific session
  useEffect(() => {
    const handleSelectSession = (e: Event) => {
      const { sessionId: targetId } = (e as CustomEvent).detail;
      if (targetId) {
        loadSessionData(targetId);
      }
    };
    window.addEventListener("select-admin-chat-session", handleSelectSession);
    return () => window.removeEventListener("select-admin-chat-session", handleSelectSession);
  }, []);

  // Realtime subscription for incoming messages
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

          if (activeSessionRef.current && newMsg.session_id === activeSessionRef.current) {
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
  }, []);

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
      const userIdsToFetch = new Set<string>();

      for (const msg of data || []) {
        if (!sessionMap.has(msg.session_id)) {
          // Extract user ID from session_id pattern "user_<uuid>"
          const userId = msg.session_id.startsWith("user_")
            ? msg.session_id.replace("user_", "")
            : (msg.sender_id || null);

          if (userId) userIdsToFetch.add(userId);

          sessionMap.set(msg.session_id, {
            sessionId: msg.session_id,
            userId,
            lastMessage: msg.message,
            lastTime: msg.created_at,
          });
        }
      }

      if (userIdsToFetch.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email, avatar_url")
          .in("id", Array.from(userIdsToFetch));

        if (profiles) {
          const profileMap = new Map(profiles.map((p) => [p.id, p]));
          for (const session of sessionMap.values()) {
            if (session.userId && profileMap.has(session.userId)) {
              const p = profileMap.get(session.userId)!;
              session.customerName = p.name;
              session.customerEmail = p.email;
              session.customerAvatar = p.avatar_url;
            }
          }
        }
      }

      setSessions(Array.from(sessionMap.values()));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSessionMessages = async (session: SessionInfo) => {
    if (activeSession === session.sessionId) return;
    await loadSessionData(session.sessionId);
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

    const currentInput = input;
    setInput("");

    const { error } = await supabase.from("chat_messages").insert(payload);
    if (error) {
      console.error(error);
      toast.error(ar ? "فشل إرسال الرسالة: " + error.message : "Failed to send: " + error.message);
      setMessages((prev) => prev.filter(m => m.id !== messageId));
    } else if (clientId) {
      // Notify customer of new support message
      await createNotification({
        user_id: clientId,
        type: "new_chat_message",
        title_ar: "رسالة جديدة من الدعم 💬",
        title_en: "New message from support 💬",
        body_ar: currentInput,
        body_en: currentInput,
        link: "/?openChat=true",
      });
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20",
    processing: "bg-blue-500/10 text-blue-600 border border-blue-500/20",
    shipped: "bg-purple-500/10 text-purple-600 border border-purple-500/20",
    delivered: "bg-green-500/10 text-green-600 border border-green-500/20",
    cancelled: "bg-red-500/10 text-red-600 border border-red-500/20",
    returned: "bg-orange-500/10 text-orange-600 border border-orange-500/20",
  };

  const statusLabel: Record<string, { ar: string; en: string }> = {
    pending: { ar: "معلق", en: "Pending" },
    processing: { ar: "قيد المعالجة", en: "Processing" },
    shipped: { ar: "تم الشحن", en: "Shipped" },
    delivered: { ar: "تم التسليم", en: "Delivered" },
    cancelled: { ar: "ملغي", en: "Cancelled" },
    returned: { ar: "مرتجع", en: "Returned" },
  };

  const formatSessionTime = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString(ar ? "ar-EG" : "en-US", { hour: "numeric", minute: "2-digit" });
    }
    return date.toLocaleDateString(ar ? "ar-EG" : "en-US", { month: "short", day: "numeric" });
  };

  const activeSessionInfo = sessions.find((s) => s.sessionId === activeSession);

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (s.customerName || "").toLowerCase();
    const email = (s.customerEmail || "").toLowerCase();
    const lastMsg = (s.lastMessage || "").toLowerCase();
    return name.includes(q) || email.includes(q) || lastMsg.includes(q) || s.sessionId.includes(q);
  });

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-3 md:space-y-5 h-[calc(100dvh-7rem)] md:h-[calc(100vh-9rem)] min-h-[500px] flex flex-col">
          {/* Header section - hidden on mobile when viewing a conversation for maximum chat screen height */}
          <div className={`${activeSession ? "hidden md:block" : "block"}`}>
            <h1 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              <span>{ar ? "محادثات الدعم" : "Support Chats"}</span>
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              {ar ? "الرد على استفسارات ومحادثات العملاء مباشرةً" : "Answer customer live inquiries directly"}
            </p>
          </div>

          <div className="flex-1 flex flex-col md:flex-row border border-border bg-card rounded-2xl overflow-hidden min-h-0 shadow-sm">
            {/* Session Sidebar: Full width on mobile when no session selected, hidden on mobile when session selected */}
            <div className={`w-full md:w-72 md:flex-shrink-0 border-b md:border-b-0 md:border-e border-border overflow-y-auto flex flex-col bg-background/50 ${
              activeSession ? "hidden md:flex" : "flex flex-1"
            }`}>
              <div className="p-3 border-b border-border bg-secondary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <span>{ar ? "المحادثات الواردة" : "Conversations"}</span>
                    {sessions.length > 0 && (
                      <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        {sessions.length}
                      </span>
                    )}
                  </span>
                </div>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute start-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={ar ? "بحث..." : "Search..."}
                    className="h-8.5 text-xs ps-8 bg-background rounded-lg border-border/80"
                  />
                </div>
              </div>

              <div className="divide-y divide-border/60 flex-1 overflow-y-auto">
                {filteredSessions.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground space-y-2">
                    <MessageSquare className="h-8 w-8 mx-auto opacity-30 text-primary" />
                    <p className="text-xs font-semibold">
                      {ar ? "لا توجد محادثات" : "No chats found"}
                    </p>
                  </div>
                )}
                {filteredSessions.map((session) => {
                  const isActive = activeSession === session.sessionId;
                  const name = session.customerName || session.customerEmail || (session.userId ? session.userId.slice(0, 8) + "..." : session.sessionId.slice(0, 8) + "...");
                  return (
                    <button
                      key={session.sessionId}
                      onClick={() => fetchSessionMessages(session)}
                      className={`w-full text-start p-3 sm:p-3.5 transition flex items-center gap-3 border-b border-border/40 hover:bg-secondary/40 ${
                        isActive ? "bg-primary/10 border-s-4 border-s-primary" : ""
                      }`}
                    >
                      {session.customerAvatar ? (
                        <div
                          className="w-10 h-10 rounded-full flex-shrink-0 shadow-xs bg-cover bg-center"
                          style={{ backgroundImage: `url(${session.customerAvatar})` }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-xs text-primary shadow-xs">
                          {name[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-xs font-bold truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                            {name}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {formatSessionTime(session.lastTime)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {session.lastMessage}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat Body: Hidden on mobile when no session selected, Full screen on mobile when session selected */}
            <div className={`flex-1 flex-col min-w-0 bg-secondary/5 ${
              activeSession ? "flex w-full" : "hidden md:flex"
            }`}>
              {activeSession ? (
                <>
                  {/* Top Bar inside Chat */}
                  <div className="p-3 sm:p-4 border-b border-border bg-card flex items-center justify-between gap-2 shadow-xs">
                    {/* Mobile Back Button */}
                    <button
                      type="button"
                      onClick={() => setActiveSession(null)}
                      className="md:hidden flex items-center gap-1 text-xs font-bold text-primary hover:bg-primary/10 px-2 py-1.5 rounded-lg transition flex-shrink-0"
                      title={ar ? "الرجوع للمحادثات" : "Back to chats"}
                    >
                      {ar ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                      <span className="text-[11px]">{ar ? "المحادثات" : "Chats"}</span>
                    </button>

                    {/* Customer Avatar & Name - centered on mobile */}
                    <div className="flex items-center gap-2 flex-1 justify-center md:justify-start">
                      {activeSessionInfo?.customerAvatar ? (
                        <div
                          className="w-8 h-8 rounded-full flex-shrink-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${activeSessionInfo.customerAvatar})` }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-xs text-primary">
                          {activeSessionInfo?.customerName ? (
                            activeSessionInfo.customerName[0].toUpperCase()
                          ) : (
                            <User className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      )}
                      <div className="text-center md:text-start">
                        <h2 className="font-bold text-xs sm:text-sm text-foreground truncate">
                          {activeSessionInfo?.customerName || activeSessionInfo?.customerEmail || (activeSessionInfo?.userId ? activeSessionInfo.userId.slice(0, 8) + "..." : activeSession.slice(0, 8) + "...")}
                        </h2>
                        <p className="text-[10px] text-green-600 font-medium flex items-center justify-center md:justify-start gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          {ar ? "محادثة قائمة" : "Active Session"}
                        </p>
                      </div>
                    </div>

                    {/* Info Toggle Button for Mobile / Tablet */}
                    <button
                      type="button"
                      onClick={() => setShowMobileCustomerInfo(true)}
                      className="xl:hidden flex items-center gap-1 text-xs font-bold text-foreground bg-secondary/60 hover:bg-secondary px-2.5 py-1.5 rounded-xl border border-border transition flex-shrink-0"
                    >
                      <Info className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[11px]">{ar ? "البيانات" : "Info"}</span>
                    </button>
                  </div>

                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3">
                    {messages.map((msg) => {
                      const isMe = msg.is_admin;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[88%] sm:max-w-[75%] md:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm shadow-xs ${
                              isMe
                                ? "bg-primary text-white rounded-br-none"
                                : "bg-card border border-border text-foreground rounded-bl-none"
                            }`}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                            <p className={`text-[9px] sm:text-[10px] mt-1 ${isMe ? "text-white/70" : "text-muted-foreground"}`}>
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

                  {/* Input Bar */}
                  <form onSubmit={handleSend} className="p-2.5 sm:p-4 border-t border-border bg-card flex gap-2">
                    <Input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={ar ? "اكتب ردك هنا..." : "Type your reply here..."}
                      className="flex-1 bg-background h-10 sm:h-11 text-xs sm:text-sm rounded-xl"
                    />
                    <Button type="submit" className="bg-primary text-white h-10 sm:h-11 px-4 sm:px-5 rounded-xl font-bold">
                      <Send className="h-4 w-4 me-1.5" />
                      <span>{ar ? "إرسال" : "Send"}</span>
                    </Button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-primary opacity-60" />
                  </div>
                  <p className="text-sm font-bold text-foreground mb-1">
                    {ar ? "محادثات الدعم المباشر" : "Live Support Messages"}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    {ar ? "اختر محادثة من القائمة لعرض الرسائل والرد على العميل" : "Select a conversation from the list to view messages and reply"}
                  </p>
                </div>
              )}
            </div>

            {/* Desktop Customer Info Panel */}
            {activeSession && (
              <div className="hidden xl:block w-72 border-s border-border overflow-y-auto flex-shrink-0 bg-background">
                <div className="p-3.5 border-b border-border bg-secondary/20">
                  <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>{ar ? "بيانات العميل" : "Customer Details"}</span>
                  </span>
                </div>
                <CustomerInfoContent
                  customerInfo={customerInfo}
                  statusColors={statusColors}
                  statusLabel={statusLabel}
                  ar={ar}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile Customer Info Dialog */}
        <Dialog open={showMobileCustomerInfo} onOpenChange={setShowMobileCustomerInfo}>
          <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col bg-background">
            <DialogHeader className="p-4 border-b border-border bg-secondary/20">
              <DialogTitle className="text-start text-sm font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span>{ar ? "بيانات العميل" : "Customer Details"}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <CustomerInfoContent
                customerInfo={customerInfo}
                statusColors={statusColors}
                statusLabel={statusLabel}
                ar={ar}
              />
            </div>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </AdminGuard>
  );
}

function CustomerInfoContent({
  customerInfo,
  statusColors,
  statusLabel,
  ar,
}: {
  customerInfo: CustomerInfo | null;
  statusColors: Record<string, string>;
  statusLabel: Record<string, { ar: string; en: string }>;
  ar: boolean;
}) {
  if (!customerInfo) {
    return (
      <div className="p-8 text-center text-muted-foreground text-xs">
        {ar ? "جاري تحميل بيانات العميل..." : "Loading customer info..."}
      </div>
    );
  }

  return (
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
          <div className="min-w-0">
            <p className="font-bold text-sm text-foreground truncate">
              {customerInfo.profile?.name || (ar ? "عميل زائر" : "Guest Customer")}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {customerInfo.profile ? (ar ? "عميل مسجل" : "Registered customer") : (ar ? "غير مسجل" : "Unregistered")}
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {customerInfo.profile?.email && (
            <a
              href={`mailto:${customerInfo.profile.email}`}
              className="flex items-center gap-2 group hover:bg-primary/5 rounded-lg px-2 py-1.5 -mx-2 transition-colors cursor-pointer"
              title={ar ? "فتح تطبيق البريد" : "Open email app"}
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs text-primary underline underline-offset-2 truncate flex-1 group-hover:opacity-80">
                {customerInfo.profile.email}
              </span>
              <span className="text-[9px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                📧 {ar ? "بريد" : "Email"}
              </span>
            </a>
          )}
          {customerInfo.profile?.phone && (
            <a
              href={`https://wa.me/${customerInfo.profile.phone.replace(/\D/g, "").replace(/^0/, "20")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 group hover:bg-green-500/5 rounded-lg px-2 py-1.5 -mx-2 transition-colors cursor-pointer"
              title={ar ? "فتح واتساب" : "Open WhatsApp"}
            >
              <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Phone className="h-3.5 w-3.5 text-green-600" />
              </div>
              <span className="text-xs text-green-600 underline underline-offset-2 flex-shrink-0 group-hover:opacity-80">
                {customerInfo.profile.phone}
              </span>
              <span className="text-[9px] font-medium text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full flex-shrink-0 ms-auto">
                💬 {ar ? "واتساب" : "WhatsApp"}
              </span>
            </a>
          )}
          {customerInfo.profile?.created_at && (
            <div className="flex items-center gap-2 px-2 py-1.5 -mx-2">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">
                {ar ? "عضو منذ " : "Member since "}
                {new Date(customerInfo.profile.created_at).toLocaleDateString(
                  ar ? "ar-EG" : "en-US",
                  { month: "short", year: "numeric" }
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Orders */}
      <div className="border-t border-border/60 pt-4">
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
                className="bg-secondary/30 border border-border/40 rounded-xl p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] font-bold text-foreground">
                      #{order.id.slice(0, 6)}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[order.status] || "bg-secondary text-muted-foreground"}`}>
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
  );
}

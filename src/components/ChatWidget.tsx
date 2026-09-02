import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, X, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { ChatMessage } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { createNotification } from "@/lib/notifications";

// Key to persist read-count in localStorage so badge doesn't return after refresh
const CHAT_READ_KEY = "perfume_note_chat_read_count";

// Notification sound player
function playNotificationSound() {
  try {
    const audio = new Audio("/sound/notification.mp3");
    audio.volume = 0.5;
    audio.play().catch(() => { });
  } catch { }
}

export function ChatWidget() {
  const { language } = useI18n();
  const ar = language === "ar";
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Session ID is always user.id for logged-in users
  const sessionId = user ? `user_${user.id}` : null;

  // Fetch messages when user logs in
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setUnreadCount(0);
      return;
    }
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Subscribe to realtime new messages
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`chat-widget-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (newMsg.session_id !== sessionId) return;

          setMessages((prev) => {
            // avoid duplicates
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            // remove temporary optimistic message with same content
            const filtered = prev.filter(m => !(m.id.startsWith('temp-') && m.message === newMsg.message));
            return [...filtered, newMsg];
          });

          // Badge only for admin replies
          if (newMsg.is_admin) {
            playNotificationSound();
            if (!isOpen) {
              setUnreadCount((c) => {
                const next = c + 1;
                return next;
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isOpen]);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Also scroll to bottom when the chat window is opened
  useEffect(() => {
    if (isOpen) {
      // Delay to ensure DOM is rendered
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    }
  }, [isOpen, messages]);

  // Load persisted unread count from localStorage on mount
  useEffect(() => {
    if (!sessionId) return;
    const savedRead = parseInt(localStorage.getItem(`${CHAT_READ_KEY}_${sessionId}`) || "0", 10);
    // Will be recalculated after fetchMessages
    void savedRead;
  }, [sessionId]);

  // Open chat: clear badge and persist read state
  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
    if (sessionId) {
      // persist that all current messages are read
      const total = messages.filter((m) => m.is_admin).length;
      localStorage.setItem(`${CHAT_READ_KEY}_${sessionId}`, String(total));
    }
  };

  // Close chat
  const handleClose = () => {
    setIsOpen(false);
  };

  const fetchMessages = async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data as ChatMessage[]);
      // Calculate unread: total admin messages minus what was already read
      if (!isOpen) {
        const adminMsgs = (data as ChatMessage[]).filter((m) => m.is_admin);
        const savedRead = parseInt(
          localStorage.getItem(`${CHAT_READ_KEY}_${sessionId}`) || "0",
          10
        );
        const unread = Math.max(0, adminMsgs.length - savedRead);
        setUnreadCount(unread);
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId || !user) return;

    const messageId = crypto.randomUUID();

    const payload = {
      id: messageId,
      sender_id: user.id,
      session_id: sessionId,
      message: input,
      is_admin: false,
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
      return;
    }

    await createNotification({
      user_id: "admin",
      type: "new_chat_message",
      title_ar: "رسالة محادثة جديدة",
      title_en: "New chat message",
      body_ar: input,
      body_en: input,
      link: "/admin/chat",
    });
  };

  return (
    <div className="fixed bottom-[64px] left-4 lg:bottom-6 lg:left-6 z-40 flex flex-col items-start" dir="ltr">
      {/* Chat Window */}
      {isOpen && (
        <div
          className="bg-card border border-border shadow-2xl rounded-2xl w-80 sm:w-96 h-[450px] flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
          dir={ar ? "rtl" : "ltr"}
        >
          {/* Header */}
          <div className="bg-primary p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <span className="font-bold text-sm">
                {ar ? "الدعم المباشر" : "Live Chat Support"}
              </span>
              {/* Online indicator */}
              <span className="flex items-center gap-1 text-white/70 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse inline-block" />
                {ar ? "متاح" : "Online"}
              </span>
            </div>
            <button onClick={handleClose} className="text-white/80 hover:text-white transition">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body: require login */}
          {!user ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center bg-secondary/10">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <LogIn className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground mb-1">
                  {ar ? "يجب تسجيل الدخول أولاً" : "Login Required"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ar
                    ? "سجّل دخولك للتواصل مع فريق الدعم"
                    : "Please log in to chat with our support team"}
                </p>
              </div>
              <Button asChild className="bg-primary text-white w-full">
                <Link to="/auth/login">
                  {ar ? "تسجيل الدخول" : "Log In"}
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/10">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground pt-12">
                    {ar ? "كيف يمكننا مساعدتك اليوم؟ اكتب استفسارك هنا." : "How can we help you today? Write your query here."}
                  </p>
                )}
                {messages.map((msg) => {
                  const isMe = !msg.is_admin;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isMe
                          ? "bg-primary text-white rounded-br-none"
                          : "bg-card border border-border text-foreground rounded-bl-none shadow-sm"
                          }`}
                      >
                        {msg.is_admin && (
                          <p className="text-[10px] font-bold text-primary mb-1 opacity-70">
                            {ar ? "فريق الدعم" : "Support Team"}
                          </p>
                        )}
                        <p className="leading-relaxed">{msg.message}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Send Input */}
              <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex gap-2">
                <Input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={ar ? "اكتب رسالة..." : "Type a message..."}
                  className="flex-1 text-sm bg-background"
                  dir={ar ? "rtl" : "ltr"}
                />
                <Button type="submit" size="icon" className="bg-primary text-white">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Trigger Bubble with notification badge */}
      <Button
        onClick={isOpen ? handleClose : handleOpen}
        size="icon"
        className="relative h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-xl hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 flex items-center justify-center border-0 outline-none"
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        {/* Unread badge */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold shadow animate-bounce">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>
    </div>
  );
}

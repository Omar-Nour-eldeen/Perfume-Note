// =====================================================
// Supabase Edge Function: send-push-notification (v2)
// نسخة مبسطة باستخدام web-push library من npm
// =====================================================

import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body = await req.json();
    const { user_id, title_ar, title_en, body_ar, body_en, link, type } = body;

    // ─── إعداد VAPID ──────────────────────────────
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    let vapidSubject =
      Deno.env.get("VAPID_SUBJECT") || "mailto:admin@perfumenote.com";

    if (vapidSubject && !vapidSubject.startsWith("mailto:") && !vapidSubject.startsWith("http")) {
      vapidSubject = `mailto:${vapidSubject}`;
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // ─── Supabase Client ───────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── جلب الاشتراكات ────────────────────────────
    let query = supabase.from("push_subscriptions").select("*");
    
    if (user_id === "admin") {
      // جلب جميع حسابات المشرفين (Admins)
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_admin", true);

      const adminUserIds = (adminProfiles || []).map((p: any) => p.id);
      adminUserIds.push("admin");

      query = query.in("user_id", adminUserIds);
    } else if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscriptions found for user:", user_id);
      return new Response(
        JSON.stringify({ message: "No subscriptions found", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    console.log(`Sending to ${subscriptions.length} subscription(s)`);

    // ─── إرسال لكل الأجهزة ────────────────────────
    const notifTag = type ? `${type}-${Date.now()}` : `notif-${Date.now()}`;
    const payload = JSON.stringify({
      title: title_ar || title_en || "Perfume Note 🌸",
      body: body_ar || body_en || "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      url: link || "/",
      tag: notifTag,
    });

    const expiredEndpoints: string[] = [];
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const isFirefox = sub.endpoint.includes('mozilla') || sub.endpoint.includes('updates.push.services');
      const isSafari = sub.endpoint.includes('apple') || sub.endpoint.includes('apn');

      try {
        // Firefox requires aes128gcm encoding and standard TTL
        const sendOptions: any = {
          TTL: 86400,
          contentEncoding: "aes128gcm",
        };
        if (!isFirefox) {
          sendOptions.urgency = "high";
        }

        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
          sendOptions
        );
        sent++;
        console.log("✅ Sent to", isFirefox ? "Firefox" : "Chrome", ":", sub.endpoint.substring(0, 60) + "...");
      } catch (err: any) {
        console.error(
          `❌ Failed sending to ${isFirefox ? 'Firefox' : 'Chrome'}:`,
          "statusCode:", err?.statusCode,
          "message:", err?.message,
          "body:", err?.body
        );
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
          console.log("🗑 Marking expired:", sub.endpoint.substring(0, 60));
        } else if (err?.statusCode === 401) {
          console.error("🔑 VAPID key mismatch! Subscription was created with a different VAPID key.");
          // على Firefox: ده معناه ان الـ subscription اتعمل بـ VAPID key تاني
          // الحل: المستخدم يعمل unsubscribe ويعيد subscribe
          expiredEndpoints.push(sub.endpoint);
        }
        failed++;
      }
    }

    // ─── حذف الاشتراكات المنتهية ──────────────────
    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
      console.log(`Cleaned up ${expiredEndpoints.length} expired subscriptions`);
    }

    return new Response(
      JSON.stringify({ sent, failed, total: subscriptions.length }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

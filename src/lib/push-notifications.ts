// =====================================================
// Perfume Note - Push Notifications Library
// مكتبة إدارة اشتراكات إشعارات الويب (Web Push)
// =====================================================

import { supabase } from './supabase';

// تحويل المفتاح العام من Base64URL إلى Uint8Array (مطلوب للـ Web Push API)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ─── تحقق هل المتصفح يدعم Push Notifications ─────
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// ─── تسجيل الـ Service Worker ─────────────────────
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('[Push] Service Worker registered:', registration.scope);
    return registration;
  } catch (err) {
    console.error('[Push] Service Worker registration failed:', err);
    return null;
  }
}

// ─── طلب إذن + اشتراك المستخدم ────────────────────
export async function subscribeToPush(userId: string, isAdmin?: boolean): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('[Push] Push not supported in this browser');
    return false;
  }

  const vapidPublicKey = (import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim();
  if (!vapidPublicKey) {
    console.error('[Push] VAPID public key not set in environment');
    return false;
  }

  try {
    // 1. اطلب إذن الإشعارات من المستخدم
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[Push] Notification permission denied:', permission);
      return false;
    }

    // 2. تسجيل أو جلب الـ Service Worker
    await registerServiceWorker();
    const registration = await navigator.serviceWorker.ready;

    // 3. إلغاء أي اشتراك قديم لمنع خطأ التشفير في Firefox / Edge / Safari عند تغيير المفاتيح
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      console.log('[Push] Clearing old push subscription...');
      await existingSub.unsubscribe().catch((err) => console.warn('[Push] Clean warning:', err));
    }

    // 4. اشتراك في Push Manager بمفتاح VAPID الحالي
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
    });

    // 5. استخراج بيانات الاشتراك
    const subscriptionJSON = subscription.toJSON();
    const p256dh = subscriptionJSON.keys?.p256dh;
    const auth = subscriptionJSON.keys?.auth;
    const endpoint = subscriptionJSON.endpoint;

    if (!p256dh || !auth || !endpoint) {
      console.error('[Push] Invalid subscription data');
      return false;
    }

    // 6. حفظ الاشتراك في Supabase (upsert لتجنب التكرار)
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,endpoint',
      }
    );

    if (error) {
      console.error('[Push] Failed to save subscription:', error);
      return false;
    }

    console.log('[Push] Successfully subscribed!');
    return true;
  } catch (err) {
    console.error('[Push] Subscribe error:', err);
    return false;
  }
}

// ─── إلغاء اشتراك المستخدم ────────────────────────
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) return true; // مش مشترك أصلاً

    const endpoint = subscription.endpoint;

    // إلغاء الاشتراك من المتصفح
    await subscription.unsubscribe();

    // حذف السجل من Supabase
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);

    console.log('[Push] Successfully unsubscribed!');
    return true;
  } catch (err) {
    console.error('[Push] Unsubscribe error:', err);
    return false;
  }
}

// ─── تحقق من حالة الاشتراك الحالية ───────────────
export async function getPushSubscriptionStatus(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported';

  const permission = Notification.permission;
  if (permission === 'denied') return 'denied';
  if (permission === 'default') return 'default';

  // Permission is 'granted' in browser -> check if active push subscription exists on this device
  try {
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = (await registerServiceWorker()) || undefined;
    }
    if (!registration) return 'default';

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      return 'granted';
    }
    return 'default';
  } catch (err) {
    console.error('[Push] Status check error:', err);
    return 'default';
  }
}

// ─── مراقبة التغيير في إذن الإشعارات تلقائياً بدون ريفريش ───────
export function watchPushPermission(
  onChange: (status: 'granted' | 'denied' | 'default' | 'unsupported') => void
): () => void {
  if (!isPushSupported()) return () => {};

  const update = async () => {
    const status = await getPushSubscriptionStatus();
    onChange(status);
  };

  // 1. عند استعادة التركيز على النافذة (مثلاً بعد تغيير الإذن من إعدادات المتصفح/أيقونة القفل)
  window.addEventListener('focus', update);

  // 2. مراقبة تغيير الإذن من الـ Permissions API للمتصفح مباشرة
  let permStatusObj: PermissionStatus | null = null;
  if ('permissions' in navigator && navigator.permissions.query) {
    navigator.permissions.query({ name: 'notifications' }).then((statusObj) => {
      permStatusObj = statusObj;
      statusObj.onchange = () => {
        update();
      };
    }).catch(() => {});
  }

  // إرجاع دالة تنظيف
  return () => {
    window.removeEventListener('focus', update);
    if (permStatusObj) {
      permStatusObj.onchange = null;
    }
  };
}

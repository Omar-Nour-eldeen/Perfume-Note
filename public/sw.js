// =====================================================
// Perfume Note - Service Worker (Push Notifications)
// يعمل في خلفية المتصفح حتى بعد إغلاق التطبيق
// =====================================================

const CACHE_NAME = 'perfume-note-sw-v1';

// ─── Install & Activate ───────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(self.clients.claim());
});

// ─── Push Event ───────────────────────────────────
// يُشغَّل فور وصول Push Notification من السيرفر حتى لو كان المتصفح مغلقاً
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'Perfume Note 🌸',
    body: 'لديك إشعار جديد',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    url: '/',
    tag: 'perfume-note-notif',
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.warn('[SW] Could not parse push data:', e);
  }

  // تحويل المسارات النسبية للأيقونات إلى روابط مطلقة لضمان ظهور الصورة عند إغلاق المتصفح
  const origin = self.location.origin;
  const iconUrl = data.icon ? (data.icon.startsWith('http') ? data.icon : `${origin}${data.icon}`) : `${origin}/favicon.ico`;
  const badgeUrl = data.badge ? (data.badge.startsWith('http') ? data.badge : `${origin}${data.badge}`) : `${origin}/favicon.ico`;

  // توليد tag فريد لكل إشعار لضمان إظهار إشعارات متعددة (Multi Notifications) وعدم استبدال الإشعار القديم
  const uniqueTag = (data.tag && data.tag !== 'perfume-note-notif')
    ? `${data.tag}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    : `perfume-note-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const notificationOptions = {
    body: data.body,
    icon: iconUrl,
    badge: badgeUrl,
    tag: uniqueTag,
    data: { url: data.url || '/' },
    requireInteraction: true, // يضمن عدم اختفاء الإشعار تلقائياً في مركز الإشعارات
    silent: false,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'عرض التفاصيل',
      },
      {
        action: 'close',
        title: 'تجاهل',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions).catch((err) => {
      console.warn('[SW] showNotification failed with full options, retrying basic options:', err);
      const basicOptions = {
        body: data.body,
        icon: iconUrl,
        tag: uniqueTag,
        data: { url: data.url || '/' },
      };
      return self.registration.showNotification(data.title, basicOptions);
    })
  );
});

// ─── Notification Click ───────────────────────────
// عند ضغط المستخدم على الإشعار → يفتح الموقع
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/';

  const origin = self.location.origin;
  const absoluteUrl = targetUrl.startsWith('http')
    ? targetUrl
    : origin + targetUrl;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // لو الموقع مفتوح → نفوكس عليه
      for (const client of clientList) {
        if (client.url === absoluteUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // لو مش مفتوح → افتح نافذة جديدة
      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteUrl);
      }
    })
  );
});

// ─── Push Subscription Change ─────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
});

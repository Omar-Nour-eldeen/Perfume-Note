-- =====================================================
-- Perfume Note - Push Notification via pg_net Trigger
-- شغّل هذا الكود في Supabase → SQL Editor
-- يستدعي Edge Function تلقائياً عند إضافة إشعار جديد
-- =====================================================

-- 1. تفعيل امتداد pg_net (متاح في Supabase بشكل افتراضي)
create extension if not exists pg_net;

-- 2. دالة ترسل Push Notification عند إدراج إشعار جديد
create or replace function public.notify_push_on_insert()
returns trigger
language plpgsql
security definer
as $$
declare
  _url     text := 'https://drzqsxnpbjfpnvqzruqs.supabase.co/functions/v1/send-push-notification';
  _key     text := current_setting('app.service_key', true);
  _payload jsonb;
begin
  _payload := jsonb_build_object(
    'user_id',  NEW.user_id,
    'title_ar', NEW.title_ar,
    'title_en', NEW.title_en,
    'body_ar',  NEW.body_ar,
    'body_en',  NEW.body_en,
    'link',     NEW.link,
    'type',     NEW.type
  );

  -- استدعاء Edge Function بشكل غير متزامن عبر pg_net
  perform net.http_post(
    url     := _url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body    := _payload::text
  );

  return NEW;
exception when others then
  -- لو pg_net غلطت → مش نوقف الإشعار في قاعدة البيانات
  raise warning '[push trigger] error: %', sqlerrm;
  return NEW;
end;
$$;

-- 3. ربط الدالة بجدول notifications عند كل INSERT
drop trigger if exists push_on_notification_insert on public.notifications;

create trigger push_on_notification_insert
  after insert on public.notifications
  for each row
  execute function public.notify_push_on_insert();


-- =====================================================
-- الخطوة الأخيرة: ضع مفتاح الـ Service Role
-- اذهب إلى: Project Settings → API → service_role key
-- ثم شغّل هذا الأمر (استبدل YOUR_SERVICE_ROLE_KEY بالمفتاح الحقيقي):
-- =====================================================

-- alter database postgres
--   set "app.service_key" = 'YOUR_SERVICE_ROLE_KEY_HERE';

-- =====================================================
-- أو الأسهل: أضف المفتاح مباشرة في الكود أعلاه
-- بدّل السطر ده:
--   _key text := current_setting('app.service_key', true);
-- بـ:
--   _key text := 'YOUR_SERVICE_ROLE_KEY_HERE';
-- =====================================================

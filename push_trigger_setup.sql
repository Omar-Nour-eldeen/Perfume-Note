-- =====================================================
-- Perfume Note - Automatic Push Notification Trigger
-- قم بتشغيل هذا المكتوب في Supabase SQL Editor
-- لضمان إرسال الإشعارات حتى لو كان الموقع / المتصفح مغلقاً تماماً
-- =====================================================

-- 1. تفعيل إضافة pg_net
create extension if not exists pg_net;

-- 2. دالة استدعاء Edge Function إشعارات الـ Push تلقائياً عند إضافة أي إشعار
create or replace function public.handle_push_notification_on_insert()
returns trigger
language plpgsql
security definer
as $$
declare
    request_id bigint;
begin
    -- استدعاء Edge Function عبر HTTP POST
    select net.http_post(
        url := 'https://drzqsxnpbjfpnvqzruqs.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
            'user_id', NEW.user_id,
            'type', NEW.type,
            'title_ar', NEW.title_ar,
            'title_en', NEW.title_en,
            'body_ar', NEW.body_ar,
            'body_en', NEW.body_en,
            'link', NEW.link
        )
    ) into request_id;

    return NEW;
exception when others then
    return NEW;
end;
$$;

-- 3. تفعيل التريجر على جدول notifications
drop trigger if exists on_notification_created_push on public.notifications;
create trigger on_notification_created_push
    after insert on public.notifications
    for each row
    execute function public.handle_push_notification_on_insert();

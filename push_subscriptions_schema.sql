-- =====================================================
-- Perfume Note - Push Notifications SQL Schema
-- انسخ هذا الكود وشغّله في Supabase SQL Editor
-- =====================================================

-- 1. إنشاء جدول اشتراكات الإشعارات للأجهزة
create table if not exists public.push_subscriptions (
    id uuid default gen_random_uuid() primary key,
    user_id text not null,
    endpoint text not null,
    p256dh text not null,
    auth text not null,
    user_agent text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint unique_user_endpoint unique (user_id, endpoint)
);

-- 2. تفعيل الحماية والأمان على مستوى الصفوف (RLS)
alter table public.push_subscriptions enable row level security;

-- 3. سياسات الأمان (RLS Policies)

-- العميل يستطيع إضافة جهازه الخاص فقط
create policy "Users can insert their own push subscription"
    on public.push_subscriptions for insert
    with check (auth.uid()::text = user_id);

-- العميل يرى اشتراكاته فقط (والأدمن يستطيع القراءة لإرسال الإشعارات)
create policy "Users can select their own push subscription"
    on public.push_subscriptions for select
    using (auth.uid()::text = user_id or auth.uid()::text in (select id::text from profiles where is_admin = true));

-- العميل يستطيع حذف اشتراك جهازه عند إلغاء تفعيل الإشعارات
create policy "Users can delete their own push subscription"
    on public.push_subscriptions for delete
    using (auth.uid()::text = user_id);

-- الـ Service Role (السيرفر) يستطيع القراءة لإرسال الإشعارات
create policy "Service role can read all push subscriptions"
    on public.push_subscriptions for select
    to service_role
    using (true);

-- العميل يستطيع تحديث اشتراكه (updated_at)
create policy "Users can update their own push subscription"
    on public.push_subscriptions for update
    using (auth.uid()::text = user_id);

-- =====================================================
-- ملاحظة: بعد تشغيل هذا الكود، يجب إضافة Secrets في Supabase:
-- Dashboard → Project Settings → Edge Functions → Secrets
-- VAPID_PRIVATE_KEY = (المفتاح الخاص المولّد)
-- VAPID_SUBJECT = mailto:admin@perfumenote.com
-- =====================================================

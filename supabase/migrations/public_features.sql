/* ══════════════════════════════════════════════════════
   NEXWAVE Public Features - Auth & Newsletter
   Run this in Supabase SQL Editor
   ══════════════════════════════════════════════════════ */

/* ── Admin Users (ERP Access Control) ── */
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select_authenticated" ON admin_users;
CREATE POLICY "admin_users_select_authenticated" ON admin_users
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admin_users_insert_own" ON admin_users;
CREATE POLICY "admin_users_insert_own" ON admin_users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

/* ── Newsletter Subscribers ── */
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT DEFAULT '',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    source TEXT DEFAULT 'countdown',
    subscribed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(email)
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_subscribers_anon_insert" ON newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_anon_insert" ON newsletter_subscribers
    FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "newsletter_subscribers_select_own" ON newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_select_own" ON newsletter_subscribers
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "newsletter_subscribers_insert_own" ON newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_insert_own" ON newsletter_subscribers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

/* ── First admin: Add your email after creating account in Supabase Auth ── */
-- Run this AFTER you create your admin account (email/password sign-in):
-- INSERT INTO admin_users (email, user_id)
-- SELECT '<YOUR_ADMIN_EMAIL>', id FROM auth.users WHERE email = '<YOUR_ADMIN_EMAIL>'
-- ON CONFLICT (email) DO NOTHING;

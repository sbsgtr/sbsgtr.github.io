/* ══════════════════════════════════════════════════════
   NEXWAVE CORE ERP - Admin Users Table
   Run this in Supabase SQL Editor
   ══════════════════════════════════════════════════════ */

/* ── ADMIN USERS TABLE (used by checkAuth() & checkIsAdmin()) ── */
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_authenticated_all" ON admin_users;
CREATE POLICY "admin_users_authenticated_all" ON admin_users
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

/* ── Insert subhashgt@icloud.com as admin ── */
/* NOTE: The user must already exist in auth.users (have signed up at least once)
   before running this. If they haven't signed up yet, the UPDATE profiles will
   be a no-op. Re-run this migration after they sign in for the first time. */
INSERT INTO admin_users (email)
VALUES ('subhashgt@icloud.com')
ON CONFLICT (email) DO NOTHING;

/* ── Also set admin role in profiles table ── */
UPDATE profiles
SET role = 'admin'
WHERE email = 'subhashgt@icloud.com';

/* ══════════════════════════════════════════════════════
   NEXWAVE CORE ERP - User Profiles & Role Management
   Run this in Supabase SQL Editor
   ══════════════════════════════════════════════════════ */

/* ── PROFILES TABLE ── */
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

/* ── Auto-create profile row when a new user signs up ── */
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'user')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

/* ── Enable Row Level Security ── */
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

/* ── RLS: allow all authenticated users (consistent with other ERP tables) ── */
DROP POLICY IF EXISTS "profiles_all_authenticated" ON profiles;
CREATE POLICY "profiles_all_authenticated" ON profiles
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

/* ── Backfill profiles for existing users (safe to re-run) ── */
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

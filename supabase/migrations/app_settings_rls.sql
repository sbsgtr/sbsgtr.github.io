/* ══════════════════════════════════════════════════════
   NEXWAVE CORE ERP - app_settings RLS Policies
   Run this in Supabase SQL Editor
   
   Anon (public site) can READ maintenance_mode only
   Authenticated (ERP) can do full CRUD
   ══════════════════════════════════════════════════════ */

/* ── Enable RLS ── */
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

/* ── Anon: read-only SELECT (public site needs maintenance_mode) ── */
DROP POLICY IF EXISTS "app_settings_anon_read" ON app_settings;
CREATE POLICY "app_settings_anon_read" ON app_settings
    FOR SELECT
    TO anon
    USING (true);

/* ── Authenticated: full CRUD (ERP admin manages all settings) ── */
DROP POLICY IF EXISTS "app_settings_authenticated_all" ON app_settings;
CREATE POLICY "app_settings_authenticated_all" ON app_settings
    FOR ALL
    TO authenticated
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

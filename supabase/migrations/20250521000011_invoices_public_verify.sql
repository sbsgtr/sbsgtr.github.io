/* ══════════════════════════════════════════════════════
   NEXWAVE CORE ERP - Public Invoice Verification RLS
   Allows anon (public) users to SELECT invoices by ID
   for the QR code verification page (pages/verify.html)
   ══════════════════════════════════════════════════════ */

-- Enable RLS on invoices table if not already enabled
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Drop any existing anon policies to avoid conflicts
DROP POLICY IF EXISTS "anon_select_invoices" ON invoices;
DROP POLICY IF EXISTS "invoices_anon_select" ON invoices;
DROP POLICY IF EXISTS "Enable anon select on invoices" ON invoices;

-- Allow anonymous users to SELECT invoices (needed for public verification)
-- Only returns rows matching the query filter (e.g., WHERE id = 'xxx')
CREATE POLICY "anon_select_invoices" ON invoices
    FOR SELECT
    TO anon
    USING (true);

-- Ensure authenticated users retain full access (if not already defined)
DROP POLICY IF EXISTS "authenticated_all_invoices" ON invoices;
CREATE POLICY "authenticated_all_invoices" ON invoices
    FOR ALL
    TO authenticated
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');


/* ══════════════════════════════════════════════════════
   Estimates Public Verification RLS
   Allows anon (public) users to SELECT estimates by ID
   for the QR code verification page
   ══════════════════════════════════════════════════════ */

ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_estimates" ON estimates;
CREATE POLICY "anon_select_estimates" ON estimates
    FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "authenticated_all_estimates" ON estimates;
CREATE POLICY "authenticated_all_estimates" ON estimates
    FOR ALL
    TO authenticated
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');


/* ── estimate_items table (public read-only access) ── */
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_estimate_items" ON estimate_items;
CREATE POLICY "anon_select_estimate_items" ON estimate_items
    FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "authenticated_all_estimate_items" ON estimate_items;
CREATE POLICY "authenticated_all_estimate_items" ON estimate_items
    FOR ALL
    TO authenticated
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

/* ══════════════════════════════════════════════════════
   NEXWAVE CORE ERP - Lock down products & customers RLS
   Run this in Supabase SQL Editor
   
   Anon (public) CANNOT access these ERP-only tables
   Authenticated (ERP users) get full CRUD
   ══════════════════════════════════════════════════════ */

/* ── PRODUCTS: authenticated only ── */
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_anon_deny" ON products;
CREATE POLICY "products_anon_deny" ON products
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);

DROP POLICY IF EXISTS "products_authenticated_all" ON products;
CREATE POLICY "products_authenticated_all" ON products
    FOR ALL
    TO authenticated
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

/* ── CUSTOMERS: authenticated only ── */
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_anon_deny" ON customers;
CREATE POLICY "customers_anon_deny" ON customers
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);

DROP POLICY IF EXISTS "customers_authenticated_all" ON customers;
CREATE POLICY "customers_authenticated_all" ON customers
    FOR ALL
    TO authenticated
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

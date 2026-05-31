/* ══════════════════════════════════════════════════════
   NEXWAVE CORE ERP - Database Tables
   Run this in Supabase SQL Editor
   ══════════════════════════════════════════════════════ */

/* ── PRODUCTS / SERVICES ── */
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'other',
    unit_price DECIMAL(12,2) DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    sku TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

/* ── CUSTOMERS / CLIENTS ── */
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

/* ── COMPANY SETTINGS (per user) ── */
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT DEFAULT 'NEXWAVE Solutions (Pvt) Ltd',
    company_address TEXT DEFAULT 'Colombo, Sri Lanka',
    company_phone TEXT DEFAULT '+94 11 234 5678',
    company_email TEXT DEFAULT 'info@nexwave.lk',
    currency TEXT DEFAULT 'LKR',
    tax_rate DECIMAL(5,2) DEFAULT 0,
    date_format TEXT DEFAULT 'local'
);

/* ── TEAM MEMBERS (legacy — see staff_registry.sql) ── */
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    phone TEXT,
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

/* ── PROJECTS ── */
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    client_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12,2),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

/* ── Enable Row Level Security ── */
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

/* ── RLS Policies: allow all authenticated users ── */
CREATE POLICY "Enable all for authenticated users" ON products
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON customers
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON company_settings
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON team_members
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON projects
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

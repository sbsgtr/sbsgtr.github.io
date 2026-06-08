/* ══════════════════════════════════════════════════════
   NEXWAVE CORE ERP - Expenses & Income Records Tables
   Used by the Accounting module (accounting.html)
   ══════════════════════════════════════════════════════ */

CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE,
    amount DECIMAL(12,2) DEFAULT 0,
    description TEXT,
    category TEXT DEFAULT 'General',
    vendor TEXT DEFAULT '',
    invoice_no TEXT,
    notes TEXT,
    has_invoice BOOLEAN DEFAULT false,
    is_recurring BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_authenticated_all" ON expenses;
CREATE POLICY "expenses_authenticated_all" ON expenses
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS income_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE,
    amount DECIMAL(12,2) DEFAULT 0,
    description TEXT,
    category TEXT DEFAULT 'General',
    source TEXT DEFAULT '',
    reference_no TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE income_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "income_records_authenticated_all" ON income_records;
CREATE POLICY "income_records_authenticated_all" ON income_records
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

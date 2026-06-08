/* ═══════════════════════════════════════════════════════════
   NEXWAVE ERP — Test Seed Data
   Paste this entire script into your Supabase SQL Editor
   and run it. All tables must exist first (run migrations).
   ═══════════════════════════════════════════════════════════
   WHAT THIS DOES:
   • 5 Products / Services
   • 5 Customers (clients)
   • 5 Staff / Team Members
   • 5 Projects (linked to customers)
   • 5 Expense Transactions (for Accounting)
   • 1 Sample Invoice + Estimate (to test printing / QR verify)
   ═══════════════════════════════════════════════════════════ */

-- ── Ensure required tables exist (safe to re-run) ──
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

-- ──────────────────────────────────────────────
-- 1. PRODUCTS (5 entries)
-- ──────────────────────────────────────────────
INSERT INTO products (name, description, category, unit_price, unit, sku) VALUES
('Siemens S7-1200 PLC', 'Compact programmable logic controller with onboard I/O, ideal for small automation systems.', 'automation', 185000.00, 'pcs', 'S7-1200'),
('CNC Spindle Motor 2.2kW', 'Air-cooled CNC spindle motor, 24000 RPM, ER20 collet, suitable for PCB routing.', 'cnc', 95000.00, 'pcs', 'CNC-SP-2200'),
('Custom PCB Design Service', 'Full turnkey PCB design — schematic capture, layout, BOM, and Gerber generation.', 'electronics', 75000.00, 'service', 'PCB-DESIGN'),
('Structural Steel Fabrication', 'Per-meter rate for custom structural steel fabrication and welding.', 'infrastructure', 12500.00, 'meter', 'STR-STEEL'),
('Acoustic Panel — 1200x600mm', 'Professional acoustic absorption panel, Class A fire rated, 50mm thick.', 'acoustics', 8500.00, 'pcs', 'ACOUSTIC-1206')
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────
-- 2. CUSTOMERS / CLIENTS (5 entries)
--    NOTE: The frontend uses column names:
--    contact_person, company_name, contact_number
--    (not "name", "company", "phone")
-- ──────────────────────────────────────────────
INSERT INTO customers (contact_person, company_name, contact_number, email, city, address) VALUES
('Kamal Perera', 'LankaTech Engineering (Pvt) Ltd', '+94 77 123 4567', 'kamal@lankatech.lk', 'Colombo 03', '42, Galle Road, Colombo 03'),
('Saman Fernando', 'Ceylon Manufacturing Solutions', '+94 71 987 6543', 'saman@ceylonmfg.lk', 'Kadawatha', '128B, Negombo Road, Kadawatha'),
('Nadeeka Dissanayake', 'GreenTech Innovations', '+94 76 555 1212', 'nadeeka@greentech.lk', 'Kandy', '55, Peradeniya Road, Kandy'),
('Ruwan Jayasuriya', 'Islandwide Construction Corp', '+94 72 333 4444', 'ruwan@islandwide.lk', 'Piliyandala', '209/1, Galle Road, Piliyandala'),
('Dinesh Wickramasinghe', 'SmartHome Lanka', '+94 75 888 9999', 'dinesh@smarthome.lk', 'Nugegoda', '77, High Level Road, Nugegoda')
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────
-- 3. STAFF / TEAM MEMBERS (5 entries)
-- ──────────────────────────────────────────────
INSERT INTO staff_registry (full_name, staff_id, department, status) VALUES
('Sanjaya Marasingha', 'MGT-001', 'Management', 'active'),
('Thusitha Abeysinghe', 'ENG-001', 'Engineering', 'active'),
('Priyanga Jayawardena', 'SAL-001', 'Sales & Marketing', 'active'),
('Dammika Seneviratne', 'ENG-002', 'Engineering', 'active'),
('Chaminda Rathnayake', 'OPS-001', 'Operations', 'active')
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────
-- 4. PROJECTS (5 entries, linked to customers)
--    Run this AFTER customers so the IDs exist.
--    These UUIDs must match the customers inserted above.
-- ──────────────────────────────────────────────
DO $$
DECLARE
    v_cust1 UUID; v_cust2 UUID; v_cust3 UUID; v_cust4 UUID; v_cust5 UUID;
BEGIN
    SELECT id INTO v_cust1 FROM customers WHERE email = 'kamal@lankatech.lk' LIMIT 1;
    SELECT id INTO v_cust2 FROM customers WHERE email = 'saman@ceylonmfg.lk' LIMIT 1;
    SELECT id INTO v_cust3 FROM customers WHERE email = 'nadeeka@greentech.lk' LIMIT 1;
    SELECT id INTO v_cust4 FROM customers WHERE email = 'ruwan@islandwide.lk' LIMIT 1;
    SELECT id INTO v_cust5 FROM customers WHERE email = 'dinesh@smarthome.lk' LIMIT 1;

    INSERT INTO projects (name, client_id, client_name, description, status, start_date, end_date, budget) VALUES
    ('Factory Automation — LankaTech Phase 1', v_cust1, 'Kamal Perera', 'SCADA system integration and PLC programming for packaging line.', 'active', '2026-06-01', '2026-09-30', 2850000.00),
    ('CNC Router Installation — Ceylon Mfg', v_cust2, 'Saman Fernando', 'Install and commission 3-axis CNC router with dust extraction.', 'active', '2026-05-15', '2026-07-15', 975000.00),
    ('PCB Lab Setup — GreenTech', v_cust3, 'Nadeeka Dissanayake', 'Design and equip a full PCB prototyping lab including fume extraction.', 'on_hold', '2026-04-01', '2026-08-01', 1550000.00),
    ('Structural Audit — Islandwide HQ', v_cust4, 'Ruwan Jayasuriya', 'Structural integrity assessment and reinforcement recommendations.', 'completed', '2026-02-01', '2026-04-30', 385000.00),
    ('Smart Lighting Retrofit — SmartHome', v_cust5, 'Dinesh Wickramasinghe', 'IoT-based smart lighting automation for 3-floor office building.', 'active', '2026-06-15', '2026-10-15', 1240000.00)
    ON CONFLICT DO NOTHING;
END $$;

-- ──────────────────────────────────────────────
-- 5. EXPENSES / TRANSACTIONS (5 entries)
--    Appears in the Accounting → Transactions tab
-- ──────────────────────────────────────────────
INSERT INTO expenses (date, amount, description, category, notes) VALUES
('2026-05-28', 340000.00, 'Component shipment — Siemens PLCs & HMIs', 'Materials', 'PO-2026-0421'),
('2026-05-20', 85000.00, 'CNC spindle bearing replacement', 'Equipment', 'INV-SP-2026'),
('2026-05-15', 12500.00, 'Freight — PCB prototype batch delivery', 'Transport / Logistics', 'AWB-776-8890'),
('2026-05-10', 180000.00, 'Subcontractor — Electrical panel wiring', 'Labor / Subcontractors', 'SUB-MAY-01'),
('2026-05-05', 28500.00, 'Office internet & server hosting (monthly)', 'Utilities / Rent', 'UTIL-MAY-2026')
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────
-- 6. INCOME RECORDS (5 entries)
--    Appears in the Accounting → Transactions tab
-- ──────────────────────────────────────────────
INSERT INTO income_records (date, amount, description, category, source, reference_no) VALUES
('2026-05-25', 420000.00, 'Consulting fees — Automation audit', 'Consulting', 'Consulting', 'INV-2026-001'),
('2026-05-18', 185000.00, 'Siemens S7-1200 PLC sale', 'Sales', 'Sales', 'INV-2026-002a'),
('2026-05-12', 375000.00, 'CNC retrofit labor — Phase 1 complete', 'Maintenance', 'Maintenance', 'INV-2026-003'),
('2026-05-08', 98000.00, 'PCB design service — Sensor board', 'Consulting', 'Consulting', 'INV-2026-004'),
('2026-05-01', 150000.00, 'Acoustic panel supply — Recording studio', 'Sales', 'Sales', 'INV-2026-005')
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────
-- 7. SAMPLE INVOICE (1 entry)
--    Links to customer #1 (Kamal Perera / LankaTech)
--    This invoice will appear in Estimates & Invoices
--    and can be printed / verified via QR code.
-- ──────────────────────────────────────────────
DO $$
DECLARE
    v_cust UUID;
BEGIN
    SELECT id INTO v_cust FROM customers WHERE email = 'kamal@lankatech.lk' LIMIT 1;

    INSERT INTO invoices (customer_id, invoice_number, status, total_amount, due_date, items)
    VALUES (
        v_cust,
        'INV-2026-001',
        'pending',
        893500.00,
        '2026-07-15',
        '[
            {"description": "Siemens S7-1200 PLC Unit", "quantity": 2, "unit_price": 185000, "total": 370000},
            {"description": "PLC Programming Service", "quantity": 40, "unit_price": 8500, "total": 340000},
            {"description": "HMI 7-inch Touch Panel", "quantity": 1, "unit_price": 125000, "total": 125000},
            {"description": "Installation & Commissioning", "quantity": 1, "unit_price": 58500, "total": 58500}
        ]'::jsonb
    )
    ON CONFLICT DO NOTHING;
END $$;

-- ═══════════════════════════════════════════════════════════
-- HOW TO VERIFY THE DATA WAS INSERTED
-- ═══════════════════════════════════════════════════════════
--
-- Run these queries in the Supabase SQL Editor to confirm:
--
--   SELECT 'products' AS tbl, count(*) FROM products
--   UNION ALL SELECT 'customers', count(*) FROM customers
--   UNION ALL SELECT 'staff_registry', count(*) FROM staff_registry
--   UNION ALL SELECT 'projects', count(*) FROM projects
--   UNION ALL SELECT 'expenses', count(*) FROM expenses
--   UNION ALL SELECT 'income_records', count(*) FROM income_records
--   UNION ALL SELECT 'invoices', count(*) FROM invoices;
--
-- Expected result: 6 rows, each with count >= 1.
--
-- Then log into the ERP at /erp/corporate.html and verify:
--   ✅ Dashboard shows customer / invoice counts
--   ✅ Products page lists 5 products
--   ✅ Customers page lists 5 customers
--   ✅ Company → Team tab lists 5 staff members
--   ✅ Company → Projects tab lists 5 projects
--   ✅ Accounting → Transactions shows income + expenses
--   ✅ Estimates & Invoices → Invoices tab shows sample invoice
-- ═══════════════════════════════════════════════════════════

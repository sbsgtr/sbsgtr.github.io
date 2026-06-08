/* ── Staff / Team Registry (Company Management) ── */
CREATE TABLE IF NOT EXISTS staff_registry (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    staff_id TEXT,
    department TEXT DEFAULT 'Engineering',
    status TEXT DEFAULT 'active',
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

/* Add columns if table existed with an older shape */
ALTER TABLE staff_registry ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE staff_registry ADD COLUMN IF NOT EXISTS staff_id TEXT;
ALTER TABLE staff_registry ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Engineering';
ALTER TABLE staff_registry ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE staff_registry ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE staff_registry ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE staff_registry ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE staff_registry ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

/* Ensure id column auto-generates (for tables created without the default) */
ALTER TABLE staff_registry ALTER COLUMN id SET DEFAULT gen_random_uuid();

/* Backfill full_name from legacy "name" column when present */
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'staff_registry' AND column_name = 'name'
    ) THEN
        UPDATE staff_registry SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;
    END IF;
END $$;

ALTER TABLE staff_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_registry_authenticated_all" ON staff_registry;
CREATE POLICY "staff_registry_authenticated_all" ON staff_registry
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');



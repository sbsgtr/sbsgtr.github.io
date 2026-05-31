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

/* Optional: migrate legacy team_members rows if that table exists */
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'team_members'
    ) THEN
        INSERT INTO staff_registry (full_name, staff_id, department, email, phone, status)
        SELECT
            COALESCE(name, 'Unknown'),
            role,
            department,
            email,
            phone,
            'active'
        FROM team_members tm
        WHERE NOT EXISTS (
            SELECT 1 FROM staff_registry sr
            WHERE sr.full_name = tm.name AND COALESCE(sr.staff_id, '') = COALESCE(tm.role, '')
        );
    END IF;
END $$;

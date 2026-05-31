/* ══════════════════════════════════════════════════════
   NEXWAVE CORE ERP - Maintenance Mode Setting
   Adds maintenance_mode boolean column to app_settings
   Run this in Supabase SQL Editor
   ══════════════════════════════════════════════════════ */

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT false;

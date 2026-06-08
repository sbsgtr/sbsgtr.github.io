/* ══════════════════════════════════════════════════════
   NEXWAVE CORE ERP - Print Document Settings
   Adds general_note and company_info fields to app_settings
   Run this in Supabase SQL Editor
   ══════════════════════════════════════════════════════ */

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS general_note TEXT DEFAULT '';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS company_info TEXT DEFAULT '';

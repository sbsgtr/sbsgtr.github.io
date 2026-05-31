/* ═════════════════════════════════════════════════════════
   NEXWAVE ERP - Supabase CRUD Utility
   ═════════════════════════════════════════════════════════
   Usage:
     npm run crud -- <table> <operation> [options]

   Tables:    team_members | projects
   Operations: list | get | create | update | delete

   Examples:
     npm run crud -- team_members list
     npm run crud -- projects list
     npm run crud -- team_members get <id>
     npm run crud -- team_members create --name "John Doe" --role "ENG-001" --department "Engineering"
     npm run crud -- projects create --name "Factory Automation" --status "active"
     npm run crud -- team_members update <id> --department "Sales"
     npm run crud -- projects delete <id>

   Environment variables (set in .env or shell):
     SUPABASE_URL         (required)
     SUPABASE_ANON_KEY    (required — anon/public key)
     SUPABASE_SERVICE_ROLE_KEY (optional — admin operations)

   ═════════════════════════════════════════════════════════ */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

/* ──────────────────────────────────────────────
   Configuration
   ────────────────────────────────────────────── */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('\n  ❌ Missing Supabase credentials.');
  console.error('     Set SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in your .env file or environment.\n');
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

/* ──────────────────────────────────────────────
   Allowed tables & their column schemas
   ────────────────────────────────────────────── */

const ALLOWED_TABLES = ['team_members', 'projects'];

const TABLE_COLUMNS = {
  team_members: {
    required: ['name'],
    optional: ['role', 'email', 'phone', 'department'],
    all: ['name', 'role', 'email', 'phone', 'department'],
  },
  projects: {
    required: ['name'],
    optional: ['client_id', 'description', 'status', 'start_date', 'end_date', 'budget'],
    all: ['name', 'client_id', 'description', 'status', 'start_date', 'end_date', 'budget'],
  },
};

/* ──────────────────────────────────────────────
   Help
   ────────────────────────────────────────────── */

function printHelp() {
  console.log(`
  NEXWAVE ERP - Supabase CRUD Utility

  Usage:
    npm run crud -- <table> <operation> [id] [--key value ...]

  Tables:
    team_members    Manage team/staff records
    projects        Manage project records

  Operations:
    list            Fetch all rows
    get <id>        Fetch a single row by UUID
    create          Insert a new row (pass fields with -- flags)
    update <id>     Update an existing row (pass fields with -- flags)
    delete <id>     Delete a row by UUID

  Examples:
    npm run crud -- team_members list
    npm run crud -- projects list
    npm run crud -- team_members create --name "Jane Doe" --role "ENG-002" --department "Engineering"
    npm run crud -- projects create --name "Smart Factory" --status "active" --budget 2500000
    npm run crud -- team_members update <uuid> --department "Sales & Marketing"
    npm run crud -- projects delete <uuid>
  `);
}

/* ──────────────────────────────────────────────
   Argument parser
   ────────────────────────────────────────────── */

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(0);
  }

  const table = args[0];
  const operation = args[1];
  const id = args[2] && !args[2].startsWith('--') ? args[2] : null;

  // Collect key-value flags (--name value)
  const fields = {};
  for (let i = id ? 3 : 2; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '');
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      fields[key] = val;
      if (val !== true) i++; // skip the value next iteration
    }
  }

  return { table, operation, id, fields };
}

/* ──────────────────────────────────────────────
   Validation helpers
   ────────────────────────────────────────────── */

function validateTable(table) {
  if (!ALLOWED_TABLES.includes(table)) {
    console.error(`\n  ❌ Invalid table "${table}". Allowed: ${ALLOWED_TABLES.join(', ')}\n`);
    process.exit(1);
  }
}

function validateId(id, label = 'ID') {
  if (!id) {
    console.error(`\n  ❌ ${label} is required (UUID format).\n`);
    process.exit(1);
  }
  // Basic UUID format check (8-4-4-4-12 hex pattern)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(id)) {
    console.error(`\n  ❌ Invalid UUID format: "${id}". Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\n`);
    process.exit(1);
  }
}

/* ──────────────────────────────────────────────
   Format output
   ────────────────────────────────────────────── */

function formatOutput(data, label) {
  console.log(`\n  ✅ ${label}`);
  console.log(`  ─${'─'.repeat(label.length + 4)}`);
  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log('  (empty result set)\n');
      return;
    }
    data.forEach((row, i) => {
      console.log(`  [${i + 1}] ${row.name || row.full_name || '(unnamed)'}`);
      for (const [key, val] of Object.entries(row)) {
        if (key === 'id') continue;
        const display = val !== null && val !== undefined ? String(val) : '—';
        console.log(`      ${key}: ${display}`);
      }
      if (i < data.length - 1) console.log('');
    });
  } else if (data && typeof data === 'object') {
    console.log(`  ID:    ${data.id}`);
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id') continue;
      const display = val !== null && val !== undefined ? String(val) : '—';
      console.log(`  ${key}: ${display}`);
    }
  }
  console.log('');
}

function handleError(err, context = 'operation') {
  const message = err?.message || String(err);
  console.error(`\n  ❌ ${context}: ${message}\n`);
  process.exit(1);
}

/* ──────────────────────────────────────────────
   CRUD Operations
   ────────────────────────────────────────────── */

async function listRows(table) {
  const { data, error } = await client.from(table).select('*').order('created_at', { ascending: false });
  if (error) handleError(error, `list ${table}`);
  formatOutput(data, `Fetched ${data.length} row(s) from "${table}"`);
  return data;
}

async function getRow(table, id) {
  const { data, error } = await client.from(table).select('*').eq('id', id).single();
  if (error) handleError(error, `get ${table} ${id}`);
  formatOutput(data, `Fetched row from "${table}"`);
  return data;
}

async function createRow(table, fields) {
  const columns = TABLE_COLUMNS[table];
  if (!columns) handleError(new Error(`Unknown table: ${table}`));

  // Check required fields
  for (const req of columns.required) {
    if (!fields[req]) {
      handleError(new Error(`Missing required field: --${req}`));
    }
  }

  // Build payload from allowed columns only
  const payload = {};
  for (const col of columns.all) {
    if (fields[col] !== undefined) {
      payload[col] = fields[col];
    }
  }

  const { data, error } = await client.from(table).insert(payload).select();
  if (error) handleError(error, `create into ${table}`);
  formatOutput(data?.[0] || data, `Created row in "${table}"`);
  return data;
}

async function updateRow(table, id, fields) {
  const columns = TABLE_COLUMNS[table];
  if (!columns) handleError(new Error(`Unknown table: ${table}`));

  // Build payload from allowed columns only
  const payload = {};
  for (const col of columns.all) {
    if (fields[col] !== undefined) {
      payload[col] = fields[col];
    }
  }

  if (Object.keys(payload).length === 0) {
    handleError(new Error('No valid fields provided to update. Use --field value syntax.'));
  }

  const { data, error } = await client.from(table).update(payload).eq('id', id).select();
  if (error) handleError(error, `update ${table} ${id}`);
  formatOutput(data?.[0] || data, `Updated row in "${table}"`);
  return data;
}

async function deleteRow(table, id) {
  const { data, error } = await client.from(table).delete().eq('id', id).select();
  if (error) handleError(error, `delete from ${table}`);
  formatOutput(data?.[0] || data, `Deleted row from "${table}"`);
  return data;
}

/* ──────────────────────────────────────────────
   Main
   ────────────────────────────────────────────── */

async function main() {
  const { table, operation, id, fields } = parseArgs();

  validateTable(table);

  console.log(`\n  🔌 Connected to Supabase project: ${SUPABASE_URL.replace(/https?:\/\//, '')}`);
  console.log(`  📋 Table: ${table}  ·  Operation: ${operation}\n`);

  switch (operation) {
    case 'list':
      await listRows(table);
      break;

    case 'get':
      validateId(id);
      await getRow(table, id);
      break;

    case 'create':
      await createRow(table, fields);
      break;

    case 'update':
      validateId(id);
      await updateRow(table, id, fields);
      break;

    case 'delete':
      validateId(id);
      await deleteRow(table, id);
      break;

    default:
      console.error(`\n  ❌ Unknown operation "${operation}".`);
      console.log('     Available: list, get, create, update, delete\n');
      process.exit(1);
  }

  console.log('  ✨ Done.\n');
}

main().catch((err) => {
  handleError(err, 'Unexpected error');
  process.exit(1);
});

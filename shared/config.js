/* ══════════════════════════════════════════════════
   NEXWAVE Solutions - Shared Configuration
   ══════════════════════════════════════════════════ */

// Legacy CONFIG object (used by pages/index.html inline scripts)
const CONFIG = {
    SUPABASE_URL: 'https://kklpalpobkkkxzzgkfro.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbHBhbHBvYmtra3h6emdrZnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg4MjcsImV4cCI6MjA5NDk0NDgyN30.OZtAI0tJLR6iUaARpmqrG07tcL21u1xDiYn3UK4OU3s',
    SUPABASE_EDGE_FUNCTION_URL: 'https://kklpalpobkkkxzzgkfro.supabase.co/functions/v1'
};

// Newer NEXWAVE_CONFIG object
const NEXWAVE_CONFIG = {
    SUPABASE_URL: CONFIG.SUPABASE_URL,
    SUPABASE_ANON_KEY: CONFIG.SUPABASE_ANON_KEY,
    APP_NAME: 'NEXWAVE Solutions',
    COMPANY: 'NEXWAVE Solutions (Pvt) Ltd',
    LOCATION: 'Colombo, Sri Lanka',
    VERSION: '2.0'
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NEXWAVE_CONFIG;
}

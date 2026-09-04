// ========================================
// Supabase Configuration
// ========================================

// SupabaseのProject URL
const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co';

// SupabaseのPublishable key
// ※ service_role key は絶対に入れない
const SUPABASE_PUBLISHABLE_KEY = 'YOUR-PUBLISHABLE-KEY';

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

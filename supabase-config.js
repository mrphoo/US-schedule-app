// ========================================
// Supabase Configuration
// ========================================

// SupabaseのProject URL
const SUPABASE_URL = 'https://andeaxxmxttboxwwnbhb.supabase.co';

// SupabaseのPublishable key
// ※ service_role key は絶対に入れない
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable__7AkHbUCWEpU2wHJgfytrg_lz2Xb4RR';

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

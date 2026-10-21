import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Cole aqui a Publishable Key do seu projeto Supabase.
export const SUPABASE_URL = 'https://cxwrraqccjurvshbqnog.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_vVuFQVrCevrlh8GPbARPhg_7jNrzK4Q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

export const isSupabaseConfigured = () =>
  SUPABASE_URL.startsWith('https://') &&
  SUPABASE_PUBLISHABLE_KEY !== 'COLE_SUA_PUBLISHABLE_KEY_AQUI' &&
  SUPABASE_PUBLISHABLE_KEY.length > 20;

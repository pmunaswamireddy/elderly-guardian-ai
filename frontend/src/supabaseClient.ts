import { createClient } from '@supabase/supabase-js';

// Read from VITE env vars (which Vite automatically exposes from .env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jjgrnhxteuenqufdjoso.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY || 'sb_secret_jfqxYkhpjRHe8d7bi4n6IQ_SSG6soSf';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

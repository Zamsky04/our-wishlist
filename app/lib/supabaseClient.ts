import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const isSupabaseReady = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = isSupabaseReady ? createClient(supabaseUrl, supabaseAnonKey) : null;

export type WishlistSupabaseClient = NonNullable<typeof supabase>;

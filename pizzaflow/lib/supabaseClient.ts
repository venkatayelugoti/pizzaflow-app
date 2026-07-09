import { createClient } from '@supabase/supabase-js';

// Support both Next.js (process.env) and Vite (import.meta.env)
const supabaseUrl =
  (typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_SUPABASE_URL : null) ||
  ((import.meta as any).env ? ((import.meta as any).env.VITE_SUPABASE_URL as string) : '') ||
  '';

const supabaseAnonKey =
  (typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : null) ||
  ((import.meta as any).env ? ((import.meta as any).env.VITE_SUPABASE_ANON_KEY as string) : '') ||
  '';

if (!supabaseUrl) {
  console.warn('Supabase URL is missing. Please configure NEXT_PUBLIC_SUPABASE_URL.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

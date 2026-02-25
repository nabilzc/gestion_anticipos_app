import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Si las credenciales faltan, usamos valores de marcador de posición durante el build 
// para evitar que Next.js falle al prerenderizar las páginas.
const isMissingVars = !supabaseUrl || !supabaseAnonKey;

export const supabase = createClient(
  supabaseUrl || 'https://tmp-placeholder.supabase.co',
  supabaseAnonKey || 'tmp-placeholder'
);

if (isMissingVars && typeof window !== 'undefined') {
  console.warn('Supabase credentials are missing. Check your .env.local file.');
}

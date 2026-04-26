import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ikthjuxdeujlhpvswank.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_e0EztK4lLDT4KzFzXJsNiw_pAOFX6tF';

const config = { url: supabaseUrl, key: supabaseKey };

if (typeof window !== 'undefined') {
  console.log('Supabase Config:', { 
    url: config.url, 
    hasKey: !!config.key,
    isPlaceholder: config.url.includes('placeholder')
  });
}

export const supabase = createClient(config.url, config.key);

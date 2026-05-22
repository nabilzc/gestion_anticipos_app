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

const customFetch = async (url: string | URL | Request, options?: RequestInit) => {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    try {
      const clone = response.clone();
      const body = await clone.json();
      
      // Llamar al Server Action dinámicamente para evitar problemas de bundler en imports estáticos
      import('@/app/actions/logError').then(({ logError }) => {
        logError(`Request fallido a Supabase: ${response.status} ${response.statusText}`, {
          url: typeof url === 'string' ? url : (url as any).url || String(url),
          method: options?.method || 'GET',
          status: response.status,
          error: body
        });
      }).catch(() => {});
    } catch (e) {
      import('@/app/actions/logError').then(({ logError }) => {
        logError(`Request fallido a Supabase: ${response.status} ${response.statusText}`, {
          url: typeof url === 'string' ? url : (url as any).url || String(url),
          method: options?.method || 'GET',
          status: response.status
        });
      }).catch(() => {});
    }
  }
  return response;
};

export const supabase = createClient(config.url, config.key, {
  global: {
    fetch: customFetch
  }
});

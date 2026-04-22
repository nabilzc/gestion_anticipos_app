import { createClient } from '@supabase/supabase-js';

// Función para obtener las credenciales de forma segura
const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Solo mostramos advertencia en el cliente (navegador)
    if (typeof window !== 'undefined') {
      console.warn('Supabase credentials are missing. Auth will not work.');
    }
    // Devolvemos placeholders solo para evitar errores de tipo/inicialización en build
    return {
      url: 'https://tmp-placeholder.supabase.co',
      key: 'tmp-placeholder'
    };
  }

  return { url, key };
};

const config = getSupabaseConfig();

if (typeof window !== 'undefined') {
  console.log('Supabase Config:', { 
    url: config.url, 
    hasKey: !!config.key,
    isPlaceholder: config.url.includes('placeholder')
  });
}

export const supabase = createClient(config.url, config.key);

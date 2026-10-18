const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envVars = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.join('=').trim().replace(/"/g, '');
});
const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log("Testing insert on centros_costos...");
    // Intentar solo con codigo y nombre
    const { data: d1, error: e1 } = await supabase.from('centros_costos').insert([{ codigo: 'TEST-123', nombre: 'Prueba RLS' }]).select();
    console.log('Insert sin activo:', d1, e1);
    
    // Si funciona, tratar de borrarlo
    if (d1 && d1.length > 0) {
        await supabase.from('centros_costos').delete().eq('id', d1[0].id);
        console.log("Cleanup done.");
    }
}
check();

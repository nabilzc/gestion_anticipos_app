const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.join('=').trim().replace(/"/g, '');
    }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking tables...");
    
    // Check centros_costos
    const { data: c1, error: e1 } = await supabase.from('centros_costos').insert([{ codigo: 'TEST-01', nombre: 'Test' }]).select();
    console.log('centros_costos insert:', e1 ? e1.message : 'success');

    // Check programas_proyectos
    const { data: c2, error: e2 } = await supabase.from('programas_proyectos').insert([{ nombre: 'Test', tipo: 'Programa' }]).select();
    console.log('programas_proyectos insert:', e2 ? e2.message : 'success');

    // Check programas_proyectos_areas
    const { data: c3, error: e3 } = await supabase.from('programas_proyectos_areas').insert([{ nombre: 'Test', tipo: 'Programa' }]).select();
    console.log('programas_proyectos_areas insert:', e3 ? e3.message : 'success');
}
check();

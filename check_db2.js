const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envVars = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.join('=').trim().replace(/"/g, '');
});
const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log("Check data...");
    const { data: d1 } = await supabase.from('programas_proyectos').select('*');
    console.log('programas_proyectos data:', d1);

    const { data: d2 } = await supabase.from('programas_proyectos_areas').select('*');
    console.log('programas_proyectos_areas data:', d2);
}
check();

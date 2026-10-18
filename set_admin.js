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
// Use service role key to bypass RLS if possible, otherwise use anon and hope it allows update
// But wait, RLS might block updating users without the correct policy.
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setAdmin() {
    console.log("Setting nzapata@fundaec.org to Administrador Global...");
    const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'Administrador Global' })
        .eq('email', 'nzapata@fundaec.org')
        .select();

    if (error) {
        console.error("Error setting admin role:", error);
    } else {
        console.log("Updated profile:", data);
    }
}
setAdmin();

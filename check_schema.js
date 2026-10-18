const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.join('=').trim().replace(/"/g, '');
    }
});

const url = `${envVars.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;

fetch(url)
  .then(res => res.json())
  .then(data => {
    fs.writeFileSync('supabase_openapi.json', JSON.stringify(data, null, 2));
    console.log('OpenAPI schema downloaded successfully to supabase_openapi.json');
    
    // Let's summarize the tables and columns
    const tables = data.definitions;
    if (tables) {
      console.log('\nFound tables:');
      Object.keys(tables).forEach(tableName => {
        console.log(`- ${tableName}`);
        const props = tables[tableName].properties;
        if (props) {
          Object.keys(props).forEach(colName => {
            const col = props[colName];
            console.log(`  * ${colName}: ${col.type} ${col.format ? `(${col.format})` : ''}`);
          });
        }
      });
    }
  })
  .catch(err => console.error('Error fetching schema:', err));

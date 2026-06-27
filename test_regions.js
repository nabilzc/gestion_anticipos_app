const { Client } = require('pg');

const regions = [
  'sa-east-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2'
];

async function testRegion(region) {
  const connectionString = `postgres://postgres.ikthjuxdeujlhpvswank:6PGlObkupfdQ8byE@aws-0-${region}.pooler.supabase.com:6543/postgres`;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log(`SUCCESS connected to region: ${region}`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`Failed for region ${region}: ${err.message}`);
    return false;
  }
}

async function run() {
  for (const r of regions) {
    const success = await testRegion(r);
    if (success) {
      console.log(`\nThe project is in region: ${r}`);
      break;
    }
  }
}

run();

const { Client } = require('pg');

const client = new Client({
  host: '2600:1f18:144f:6d01:283c:4560:40ce:9730',
  port: 5432,
  user: 'postgres',
  password: '6PGlObkupfdQ8byE',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => {
    console.log('SUCCESS: Connected directly via IPv6!');
    return client.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'');
  })
  .then((res) => {
    console.log('Tables:', res.rows);
    return client.end();
  })
  .catch(err => {
    console.error('Failed to connect direct:', err);
  });

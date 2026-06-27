const { Client } = require('pg');
const fs = require('fs');

const connectionString = 'postgres://postgres.ikthjuxdeujlhpvswank:6PGlObkupfdQ8byE@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ 
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  await client.connect();

  console.log('Connected to Supabase Postgres database. Querying schema...');

  // 1. Get all user tables in public schema
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  
  const tables = tablesRes.rows.map(r => r.table_name);
  console.log('Tables found:', tables);

  let sqlOutput = `-- ============================================================\n`;
  sqlOutput += `-- SQL Schema Reconstruction for FUNDAEC Gestión de Anticipos\n`;
  sqlOutput += `-- Generated on ${new Date().toISOString()}\n`;
  sqlOutput += `-- ============================================================\n\n`;

  // 2. We want to dump each table's schema, constraints, and RLS/policies
  for (const table of tables) {
    sqlOutput += `-- ------------------------------------------------------------\n`;
    sqlOutput += `-- Table: ${table}\n`;
    sqlOutput += `-- ------------------------------------------------------------\n`;
    
    // Get columns
    const columnsRes = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [table]);
    
    sqlOutput += `CREATE TABLE IF NOT EXISTS public.${table} (\n`;
    const colLines = columnsRes.rows.map(col => {
      let line = `  ${col.column_name} ${col.data_type.toUpperCase()}`;
      if (col.character_maximum_length) {
        line += `(${col.character_maximum_length})`;
      }
      if (col.is_nullable === 'NO') {
        line += ` NOT NULL`;
      }
      if (col.column_default) {
        // clean up default values slightly if necessary
        line += ` DEFAULT ${col.column_default}`;
      }
      return line;
    });

    // Get primary key / unique / foreign keys constraints
    const constraintsRes = await client.query(`
      SELECT
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = $1;
    `, [table]);

    // Format constraints
    const pkConstraints = constraintsRes.rows.filter(r => r.constraint_type === 'PRIMARY KEY');
    if (pkConstraints.length > 0) {
      colLines.push(`  CONSTRAINT ${table}_pkey PRIMARY KEY (${pkConstraints.map(r => r.column_name).join(', ')})`);
    }

    const fkConstraints = constraintsRes.rows.filter(r => r.constraint_type === 'FOREIGN KEY');
    fkConstraints.forEach(r => {
      colLines.push(`  CONSTRAINT ${r.constraint_name} FOREIGN KEY (${r.column_name}) REFERENCES public.${r.foreign_table_name}(${r.foreign_column_name}) ON DELETE CASCADE`);
    });

    sqlOutput += colLines.join(',\n');
    sqlOutput += `\n);\n\n`;

    // Check if RLS is enabled for this table
    const rlsRes = await client.query(`
      SELECT relrowsecurity 
      FROM pg_class 
      WHERE oid = 'public.${table}'::regclass;
    `);
    const rlsEnabled = rlsRes.rows[0] ? rlsRes.rows[0].relrowsecurity : false;
    if (rlsEnabled) {
      sqlOutput += `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;\n\n`;
    }

    // Get policies
    const policiesRes = await client.query(`
      SELECT policyname, cmd, roles, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = $1;
    `, [table]);

    if (policiesRes.rows.length > 0) {
      sqlOutput += `-- Policies for ${table}\n`;
      policiesRes.rows.forEach(p => {
        sqlOutput += `CREATE POLICY "${p.policyname}" ON public.${table}\n`;
        sqlOutput += `  FOR ${p.cmd}\n`;
        if (p.roles && p.roles.join(',') !== 'public') {
          sqlOutput += `  TO ${p.roles.join(', ')}\n`;
        }
        if (p.qual) {
          sqlOutput += `  USING (${p.qual})\n`;
        }
        if (p.with_check) {
          sqlOutput += `  WITH CHECK (${p.with_check})\n`;
        }
        sqlOutput += `;\n\n`;
      });
    }
  }

  // 3. Get all triggers and functions in public schema
  const triggersRes = await client.query(`
    SELECT 
      t.trigger_name,
      event_manipulation,
      event_object_table AS table_name,
      action_statement AS trigger_action,
      action_timing
    FROM 
      information_schema.triggers t
    WHERE 
      trigger_schema = 'public';
  `);

  if (triggersRes.rows.length > 0) {
    sqlOutput += `-- ============================================================\n`;
    sqlOutput += `-- Triggers and Functions\n`;
    sqlOutput += `-- ============================================================\n\n`;
    
    triggersRes.rows.forEach(t => {
      sqlOutput += `-- Trigger: ${t.trigger_name} on ${t.table_name}\n`;
      sqlOutput += `-- Timing: ${t.action_timing} ${t.event_manipulation}\n`;
      sqlOutput += `-- Action: ${t.trigger_action}\n\n`;
    });
  }

  // Write to migrations/init.sql
  fs.writeFileSync('supabase/migrations/init.sql', sqlOutput);
  console.log('Schema output successfully written to supabase/migrations/init.sql');

  await client.end();
}

run().catch(err => {
  console.error('Error running schema exporter:', err);
  process.exit(1);
});

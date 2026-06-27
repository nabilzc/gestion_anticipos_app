"use server";

import { Client } from 'pg';

export async function runDatabaseFix() {
  const regions = [
    'sa-east-1',
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'eu-central-1',
    'eu-west-1',
    'eu-west-2',
    'eu-west-3',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
    'ap-northeast-2',
    'ca-central-1'
  ];

  let success = false;
  let successRegion = '';
  let finalMessage = '';
  let errors: string[] = [];

  for (const region of regions) {
    const connString = `postgres://postgres.ikthjuxdeujlhpvswank:6PGlObkupfdQ8byE@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    try {
      const client = new Client({
        connectionString: connString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000 // timeout rápido de 3 segundos por región
      });
      await client.connect();
      console.log(`DB Fix: Successfully connected to region: ${region}`);
      
      const alterQuery = `ALTER TABLE public.anticipos ADD COLUMN IF NOT EXISTS aprobador_email TEXT;`;
      await client.query(alterQuery);
      
      const reloadQuery = `NOTIFY pgrst, 'reload schema';`;
      await client.query(reloadQuery);
      
      await client.end();
      success = true;
      successRegion = region;
      finalMessage = `Database fix successfully applied via region: ${region}`;
      break;
    } catch (err: any) {
      console.log(`DB Fix: Connection failed for region ${region}: ${err.message}`);
      errors.push(`${region}: ${err.message}`);
    }
  }

  if (success) {
    return { success: true, message: finalMessage };
  } else {
    return { 
      success: false, 
      error: `Could not connect to any of the tested regions. Errors:\n${errors.join('\n')}` 
    };
  }
}

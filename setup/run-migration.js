import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new pg.Client({
  host: '148.230.118.233',
  port: 5432,
  user: 'postgres',
  password: 'your-super-secret-and-long-postgres-password',
  database: 'postgres',
});

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL');

  const sql = readFileSync(join(__dirname, 'migration.sql'), 'utf-8');
  await client.query(sql);
  console.log('Migration executed successfully');

  await client.end();
}

run().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});

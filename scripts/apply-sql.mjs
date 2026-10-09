/**
 * Aplica um arquivo SQL diretamente no Postgres do Supabase (usa a connection
 * string de acesso direto, que não passa pelo PostgREST — necessário para DDL).
 *
 * Uso:
 *   DB_URL="postgresql://postgres:SENHA@db.PROJETO.supabase.co:5432/postgres" npm run db:sql -- supabase/migrations/0005_seed_cblow.sql
 */
import { readFile } from "node:fs/promises";

import { Client } from "pg";

const [, , sqlPath] = process.argv;
const connectionString = process.env.DB_URL;

if (!sqlPath || !connectionString) {
  console.error("Uso: DB_URL=<postgres://...> npm run db:sql -- <arquivo.sql>");
  process.exit(1);
}

const sql = await readFile(sqlPath, "utf8");
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log(`[OK] ${sqlPath} aplicado.`);
} catch (err) {
  console.error(`[ERROR] ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}

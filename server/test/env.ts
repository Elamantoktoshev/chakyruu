import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT_ENV = fileURLToPath(new URL('../../.env', import.meta.url));

/** DATABASE_URL from the monorepo .env, switched to the isolated `test` schema. */
export function testDatabaseUrl(): string {
  if (!process.env.DATABASE_URL && existsSync(ROOT_ENV)) process.loadEnvFile(ROOT_ENV);
  const base = process.env.DATABASE_URL;
  if (!base) return '';
  const url = new URL(base);
  url.searchParams.set('schema', 'test');
  return url.toString();
}

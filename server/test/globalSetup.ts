import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { testDatabaseUrl } from './env.js';

const SERVER_DIR = fileURLToPath(new URL('..', import.meta.url));

/** Applies migrations to the isolated test schema before integration tests run. */
export default function setup(): void {
  const databaseUrl = testDatabaseUrl();
  if (!databaseUrl) {
    throw new Error('Integration tests need DATABASE_URL in ../.env and a running Postgres (docker compose up -d).');
  }
  execFileSync('npx', ['prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], {
    cwd: SERVER_DIR,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });
}

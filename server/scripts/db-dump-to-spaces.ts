/**
 * Manual database backup to DigitalOcean Spaces (in addition to Managed PostgreSQL's daily backups).
 *
 *   npm run db:dump -w server
 *
 * Needs `pg_dump` (version ≥ the server's, PostgreSQL 16: `brew install postgresql@16` or libpq),
 * DATABASE_URL of the database to back up, and SPACES_KEY / SPACES_SECRET / SPACES_BUCKET / SPACES_REGION.
 * The dump is a private object under backups/ — never public, unlike photos.
 */
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createSpacesClient } from '../src/storage/spaces.provider.js';

const BACKUP_PREFIX = 'backups';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** chakyruu-2027-06-15T17-00-00Z.dump */
export function backupName(date: Date): string {
  return `chakyruu-${date.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-')}.dump`;
}

/** Custom format: compressed, restorable table by table with pg_restore. */
function runPgDump(databaseUrl: string, file: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--dbname', databaseUrl], { stdio: ['ignore', 'pipe', 'inherit'] });
    child.on('error', (error: NodeJS.ErrnoException) =>
      reject(error.code === 'ENOENT' ? new Error('pg_dump not found — install PostgreSQL 16 client tools (brew install postgresql@16)') : error),
    );
    child.stdout.pipe(createWriteStream(file));
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`pg_dump exited with ${code}`))));
  });
}

async function main(): Promise<void> {
  const databaseUrl = required('DATABASE_URL');
  const config = {
    key: required('SPACES_KEY'),
    secret: required('SPACES_SECRET'),
    bucket: required('SPACES_BUCKET'),
    region: required('SPACES_REGION'),
    cdnUrl: '',
  };
  const dir = await mkdtemp(path.join(tmpdir(), 'chakyruu-dump-'));
  const name = backupName(new Date());
  const file = path.join(dir, name);
  try {
    await runPgDump(databaseUrl, file);
    const { size } = await stat(file);
    await createSpacesClient(config).send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: `${BACKUP_PREFIX}/${name}`,
        Body: createReadStream(file),
        ContentLength: size,
        ContentType: 'application/octet-stream',
        ACL: 'private',
      }),
    );
    console.info(`Backup uploaded: ${BACKUP_PREFIX}/${name} (${(size / 1024 / 1024).toFixed(1)} MB)`);
    console.info(`Restore: pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" ${name}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error('Backup failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

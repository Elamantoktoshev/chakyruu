/**
 * Moves files from server/uploads to DigitalOcean Spaces and points the database at the CDN.
 *
 *   npm run uploads:to-spaces -w server -- --dry-run   # show what would happen
 *   npm run uploads:to-spaces -w server                # do it
 *
 * Needs DATABASE_URL (the production database) and SPACES_KEY / SPACES_SECRET / SPACES_BUCKET /
 * SPACES_REGION / SPACES_CDN_URL. Safe to run again: uploaded files are skipped, and only URLs
 * still starting with /uploads/ are rewritten.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { rewriteUploadUrls } from '../src/storage/rewriteUploadUrls.js';
import { IMMUTABLE_CACHE, SPACES_PREFIX, createSpacesClient, type SpacesConfig } from '../src/storage/spaces.provider.js';
import { CONTENT_TYPES, KEY_PATTERN, type StoredFileType } from '../src/storage/storage.provider.js';

const UPLOADS_DIR = fileURLToPath(new URL('../uploads', import.meta.url));

function readConfig(): SpacesConfig {
  const names = ['SPACES_KEY', 'SPACES_SECRET', 'SPACES_BUCKET', 'SPACES_REGION', 'SPACES_CDN_URL'] as const;
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0 || !process.env.DATABASE_URL) {
    throw new Error(`Set DATABASE_URL and ${names.join(', ')} first (missing: ${[...missing, ...(process.env.DATABASE_URL ? [] : ['DATABASE_URL'])].join(', ')})`);
  }
  const env = process.env as Record<(typeof names)[number], string>;
  return { key: env.SPACES_KEY, secret: env.SPACES_SECRET, bucket: env.SPACES_BUCKET, region: env.SPACES_REGION, cdnUrl: env.SPACES_CDN_URL.replace(/\/+$/, '') };
}

async function localFiles(): Promise<string[]> {
  const names = await readdir(UPLOADS_DIR).catch(() => []);
  return names.filter((name) => KEY_PATTERN.test(name));
}

async function uploadFiles(config: SpacesConfig, isDryRun: boolean): Promise<{ uploaded: number; skipped: number }> {
  const client = createSpacesClient(config);
  let uploaded = 0;
  let skipped = 0;
  for (const name of await localFiles()) {
    const objectKey = `${SPACES_PREFIX}/${name}`;
    const exists = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: objectKey })).then(
      () => true,
      () => false,
    );
    if (exists) {
      skipped += 1;
      continue;
    }
    uploaded += 1;
    if (isDryRun) continue;
    const type = path.extname(name).slice(1) as StoredFileType;
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        Body: await readFile(path.join(UPLOADS_DIR, name)),
        ContentType: CONTENT_TYPES[type],
        CacheControl: IMMUTABLE_CACHE,
        ACL: 'public-read',
      }),
    );
  }
  return { uploaded, skipped };
}

async function main(): Promise<void> {
  const isDryRun = process.argv.includes('--dry-run');
  const config = readConfig();
  const prisma = new PrismaClient();
  try {
    const files = await uploadFiles(config, isDryRun);
    const urls = (await rewriteUploadUrls(prisma, config.cdnUrl, isDryRun)).map(({ column, count }) => `${column}: ${count}`);
    const verb = isDryRun ? 'would upload' : 'uploaded';
    console.info(`${isDryRun ? '[dry run] ' : ''}Files: ${verb} ${files.uploaded}, already in Spaces ${files.skipped}`);
    console.info(`${isDryRun ? '[dry run] ' : ''}URLs ${isDryRun ? 'to rewrite' : 'rewritten'}:\n  ${urls.join('\n  ')}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

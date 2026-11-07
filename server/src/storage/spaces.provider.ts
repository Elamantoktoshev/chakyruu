import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { CONTENT_TYPES, KEY_PATTERN, newKey, type StorageProvider, type StoredFile, type StoredFileType } from './storage.provider.js';

/** File names are random UUIDs and never reused, so browsers and the CDN may keep them forever. */
export const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
/** Objects live under this folder in the bucket (same URL path as local /uploads). */
export const SPACES_PREFIX = 'uploads';

export interface SpacesConfig {
  key: string;
  secret: string;
  bucket: string;
  /** fra1, ams3, … */
  region: string;
  /** https://<bucket>.<region>.cdn.digitaloceanspaces.com or a custom CDN domain. */
  cdnUrl: string;
}

type S3Sender = Pick<S3Client, 'send'>;

export function createSpacesClient({ key, secret, region }: SpacesConfig): S3Client {
  return new S3Client({
    endpoint: `https://${region}.digitaloceanspaces.com`,
    // Spaces ignores the AWS region but the SDK requires one.
    region: 'us-east-1',
    credentials: { accessKeyId: key, secretAccessKey: secret },
  });
}

/** DigitalOcean Spaces (S3-compatible): public-read objects served through the Spaces CDN. */
export class SpacesStorageProvider implements StorageProvider {
  private readonly cdnUrl: string;

  constructor(
    private readonly client: S3Sender,
    private readonly bucket: string,
    cdnUrl: string,
  ) {
    this.cdnUrl = cdnUrl.replace(/\/+$/, '');
  }

  async save(data: Buffer, type: StoredFileType): Promise<StoredFile> {
    const key = newKey(type);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: `${SPACES_PREFIX}/${key}`,
        Body: data,
        ContentType: CONTENT_TYPES[type],
        ContentLength: data.length,
        CacheControl: IMMUTABLE_CACHE,
        ACL: 'public-read',
      }),
    );
    return { key, url: `${this.cdnUrl}/${SPACES_PREFIX}/${key}` };
  }

  async remove(key: string): Promise<void> {
    if (!KEY_PATTERN.test(key)) throw new Error(`Refusing to delete unexpected storage key: ${key}`);
    // S3 DELETE succeeds for missing objects, like the local provider ignoring ENOENT.
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: `${SPACES_PREFIX}/${key}` }));
  }
}

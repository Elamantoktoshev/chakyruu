import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ImageType } from './image.js';

export interface StoredFile {
  /** Provider-specific identifier used to delete the file later. */
  key: string;
  /** URL the browser loads the file from. */
  url: string;
}

/** File storage for user uploads. Local disk now; DigitalOcean Spaces later. */
export interface StorageProvider {
  saveImage(data: Buffer, type: ImageType): Promise<StoredFile>;
  remove(key: string): Promise<void>;
}

/** Keys are always `<uuid>.<ext>` — anything else (e.g. "../x") is refused. */
const KEY_PATTERN = /^[a-f0-9-]{36}\.(jpeg|png|webp)$/;

function newKey(type: ImageType): string {
  return `${randomUUID()}.${type}`;
}

export class LocalStorageProvider implements StorageProvider {
  constructor(
    private readonly dir: string,
    private readonly publicPath = '/uploads',
  ) {}

  async saveImage(data: Buffer, type: ImageType): Promise<StoredFile> {
    await mkdir(this.dir, { recursive: true });
    const key = newKey(type);
    await writeFile(path.join(this.dir, key), data, { flag: 'wx' });
    return { key, url: `${this.publicPath}/${key}` };
  }

  async remove(key: string): Promise<void> {
    if (!KEY_PATTERN.test(key)) throw new Error(`Refusing to delete unexpected storage key: ${key}`);
    try {
      await unlink(path.join(this.dir, key));
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}

/** Tests: keeps files in memory. */
export class MemoryStorageProvider implements StorageProvider {
  private files: ReadonlyMap<string, Buffer> = new Map();

  async saveImage(data: Buffer, type: ImageType): Promise<StoredFile> {
    const key = newKey(type);
    this.files = new Map([...this.files, [key, data]]);
    return { key, url: `/uploads/${key}` };
  }

  async remove(key: string): Promise<void> {
    this.files = new Map([...this.files].filter(([existing]) => existing !== key));
  }

  get size(): number {
    return this.files.size;
  }
}

import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { describe, expect, it } from 'vitest';
import { TINY_MP3 } from '../../test/app.js';
import { IMMUTABLE_CACHE, SpacesStorageProvider } from './spaces.provider.js';

function fakeClient() {
  const commands: unknown[] = [];
  return { commands, client: { send: async (command: unknown) => (commands.push(command), {}) } as never };
}

describe('SpacesStorageProvider', () => {
  it('uploads a public, immutable object and returns its CDN URL', async () => {
    const { client, commands } = fakeClient();
    const storage = new SpacesStorageProvider(client, 'chakyruu', 'https://chakyruu.fra1.cdn.digitaloceanspaces.com/');
    const stored = await storage.save(TINY_MP3, 'mp3');

    expect(stored.key).toMatch(/^[a-f0-9-]{36}\.mp3$/);
    expect(stored.url).toBe(`https://chakyruu.fra1.cdn.digitaloceanspaces.com/uploads/${stored.key}`);
    const put = commands[0] as PutObjectCommand;
    expect(put).toBeInstanceOf(PutObjectCommand);
    expect(put.input).toMatchObject({
      Bucket: 'chakyruu',
      Key: `uploads/${stored.key}`,
      ContentType: 'audio/mpeg',
      CacheControl: IMMUTABLE_CACHE,
      ACL: 'public-read',
      ContentLength: TINY_MP3.length,
    });
  });

  it('deletes by key and refuses keys that could escape the uploads folder', async () => {
    const { client, commands } = fakeClient();
    const storage = new SpacesStorageProvider(client, 'chakyruu', 'https://cdn.example');
    const key = '0b6f2c1e-5d1a-4c9e-9a51-1f3c2d4e5f60.webp';
    await storage.remove(key);
    expect((commands[0] as DeleteObjectCommand).input).toEqual({ Bucket: 'chakyruu', Key: `uploads/${key}` });
    await expect(storage.remove('../secrets.env')).rejects.toThrow(/unexpected storage key/);
    expect(commands).toHaveLength(1);
  });
});

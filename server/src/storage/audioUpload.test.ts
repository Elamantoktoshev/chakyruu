import { describe, expect, it } from 'vitest';
import { TINY_MP3 } from '../../test/app.js';
import { replaceAudio } from './audioUpload.js';
import { MemoryStorageProvider } from './storage.provider.js';

const keepAsIs = async (data: Buffer) => ({ data, isCompressed: false });

describe('replaceAudio', () => {
  it('stores the new file and deletes the replaced one', async () => {
    const storage = new MemoryStorageProvider();
    const first = await replaceAudio(storage, keepAsIs, TINY_MP3, null, async () => undefined);
    await replaceAudio(storage, keepAsIs, TINY_MP3, first.key, async () => undefined);
    expect(storage.size).toBe(1);
  });

  it('removes the new file when saving its URL fails', async () => {
    const storage = new MemoryStorageProvider();
    const failingSave = async () => {
      throw new Error('database is down');
    };
    await expect(replaceAudio(storage, keepAsIs, TINY_MP3, null, failingSave)).rejects.toThrow('database is down');
    expect(storage.size).toBe(0);
  });
});

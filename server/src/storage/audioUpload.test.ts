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

  it('passes the detected format to the converter and stores an mp3', async () => {
    const storage = new MemoryStorageProvider();
    const formats: string[] = [];
    const ogg = Buffer.from('OggS\x00\x02rest-of-the-file', 'latin1');
    const stored = await replaceAudio(storage, async (data, format) => {
      formats.push(format);
      return { data: TINY_MP3, isCompressed: true };
    }, ogg, null, async () => undefined);
    expect(formats).toEqual(['ogg']);
    expect(stored.key.endsWith('.mp3')).toBe(true);
  });

  it('rejects files that are not audio', async () => {
    const storage = new MemoryStorageProvider();
    await expect(replaceAudio(storage, keepAsIs, Buffer.from('<html>'), null, async () => undefined)).rejects.toMatchObject({ status: 400 });
    expect(storage.size).toBe(0);
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

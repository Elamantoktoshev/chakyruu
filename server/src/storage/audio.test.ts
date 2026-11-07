import { describe, expect, it } from 'vitest';
import { TINY_MP3 } from '../../test/app.js';
import { HttpError } from '../lib/http.js';
import { existsSync } from 'node:fs';
import { FFMPEG_COMMAND, compressMp3, detectMp3, spawnFfmpeg, type FfmpegRunner } from './audio.js';

/** MPEG-1 Layer III frame header without an ID3 tag. */
const BARE_FRAME = Buffer.from([0xff, 0xfb, 0x90, 0x64, 0x00, 0x00]);

const missingBinary: FfmpegRunner = async () => {
  throw Object.assign(new Error('spawn ffmpeg ENOENT'), { code: 'ENOENT' });
};

describe('detectMp3', () => {
  it('accepts an ID3 tag or a bare MPEG audio frame', () => {
    expect(detectMp3(TINY_MP3)).toBe(true);
    expect(detectMp3(BARE_FRAME)).toBe(true);
  });

  it('rejects other formats renamed to .mp3', () => {
    for (const data of ['<html><script>', 'RIFF\x00\x00\x00\x00WAVE', 'OggS\x00', '\x89PNG\r\n\x1a\n', 'ID', '\xff\xe0\x00']) {
      expect(detectMp3(Buffer.from(data, 'latin1')), JSON.stringify(data)).toBe(false);
    }
    // Frame sync with the reserved "layer 00" bits is not MPEG audio.
    expect(detectMp3(Buffer.from([0xff, 0xf9, 0x90, 0x64]))).toBe(false);
  });
});

describe('compressMp3', () => {
  it('re-encodes to 128 kbps when ffmpeg is available and the result is smaller', async () => {
    const smaller = Buffer.concat([Buffer.from('ID3', 'latin1'), Buffer.alloc(4)]);
    const runner: FfmpegRunner = async (_input, args) => {
      expect(args).toEqual(expect.arrayContaining(['-b:a', '128k']));
      return smaller;
    };
    expect(await compressMp3(TINY_MP3, runner)).toEqual({ data: smaller, isCompressed: true });
  });

  it('keeps the original when ffmpeg is not installed', async () => {
    expect(await compressMp3(TINY_MP3, missingBinary)).toEqual({ data: TINY_MP3, isCompressed: false });
  });

  it('keeps the original when re-encoding would not make it smaller', async () => {
    const bigger = Buffer.concat([TINY_MP3, TINY_MP3]);
    expect(await compressMp3(TINY_MP3, async () => bigger)).toEqual({ data: TINY_MP3, isCompressed: false });
  });

  it('rejects files ffmpeg cannot decode', async () => {
    const broken: FfmpegRunner = async () => {
      throw new Error('Invalid data found when processing input');
    };
    await expect(compressMp3(TINY_MP3, broken)).rejects.toBeInstanceOf(HttpError);
  });
});

describe('spawnFfmpeg', () => {
  it('reports a missing binary as ENOENT', async () => {
    await expect(spawnFfmpeg(TINY_MP3, ['-version'], 'ffmpeg-binary-that-does-not-exist')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe('compressMp3 with the real ffmpeg', () => {
  const hasFfmpeg = existsSync(FFMPEG_COMMAND);

  it.runIf(hasFfmpeg)('turns a 320 kbps song into a smaller 128 kbps mp3', { timeout: 30_000 }, async () => {
    // 20 s of a 440 Hz tone at 320 kbps, made by ffmpeg itself.
    const original = await spawnFfmpeg(Buffer.alloc(0), [
      '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=20',
      '-codec:a', 'libmp3lame', '-b:a', '320k', '-f', 'mp3', 'pipe:1',
    ]);
    const { data, isCompressed } = await compressMp3(original);
    expect(isCompressed).toBe(true);
    expect(detectMp3(data)).toBe(true);
    expect(data.length).toBeLessThan(original.length / 2);
  });

  it.runIf(hasFfmpeg)('rejects a file ffmpeg cannot decode', { timeout: 30_000 }, async () => {
    const garbage = Buffer.concat([Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00', 'latin1'), Buffer.alloc(4096, 0x5a)]);
    await expect(compressMp3(garbage)).rejects.toBeInstanceOf(HttpError);
  });
});

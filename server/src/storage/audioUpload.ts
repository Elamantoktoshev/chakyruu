import { MAX_MUSIC_BYTES } from '@chakyruu/shared';
import type { RequestHandler } from 'express';
import { HttpError } from '../lib/http.js';
import { compressMp3, convertToMp3, detectAudioFormat, type AudioFormat, type CompressedAudio } from './audio.js';
import { receiveFile } from './receiveFile.js';
import type { StorageProvider, StoredFile } from './storage.provider.js';
import { logger } from '../lib/logger.js';

/** Turns an upload into the mp3 we store; injectable so tests do not depend on ffmpeg being installed. */
export type AudioCompressor = (data: Buffer, format: AudioFormat) => Promise<CompressedAudio>;

export const defaultAudioCompressor: AudioCompressor = (data, format) => (format === 'mp3' ? compressMp3(data) : convertToMp3(data));

/** One audio field (mp3, m4a, aac, ogg, wav, flac) plus the `durationSec` measured by the browser. */
export function receiveAudio(field: string, maxBytes: number = MAX_MUSIC_BYTES): RequestHandler {
  return receiveFile({ field, maxBytes, maxFields: 1 });
}

/** Validates by magic bytes, converts / compresses to mp3, stores, then deletes the file it replaces. */
export async function replaceAudio(
  storage: StorageProvider,
  compress: AudioCompressor,
  data: Buffer,
  previousKey: string | null,
  save: (stored: StoredFile) => Promise<void>,
): Promise<StoredFile> {
  const format = detectAudioFormat(data);
  if (!format) throw new HttpError(400, 'Only audio files are allowed (mp3, m4a, aac, ogg, wav, flac)');
  const { data: compressed } = await compress(data, format);
  const stored = await storage.save(compressed, 'mp3');
  try {
    await save(stored);
  } catch (error: unknown) {
    // The row was not updated: the new file is an orphan.
    await removeQuietly(storage, stored.key);
    throw error;
  }
  if (previousKey) await removeQuietly(storage, previousKey);
  return stored;
}

/** A leftover file costs a few MB; failing the user's request for it would be worse. */
export async function removeQuietly(storage: StorageProvider, key: string): Promise<void> {
  await storage.remove(key).catch((error: unknown) => {
    logger.error({ err: error }, `[storage] could not delete replaced file ${key}`);
  });
}

import { MAX_MUSIC_BYTES } from '@chakyruu/shared';
import type { RequestHandler } from 'express';
import { HttpError } from '../lib/http.js';
import { compressMp3, type CompressedAudio } from './audio.js';
import { detectMp3 } from './audio.js';
import { receiveFile } from './receiveFile.js';
import type { StorageProvider, StoredFile } from './storage.provider.js';

/** Re-encodes an uploaded mp3; injectable so tests do not depend on ffmpeg being installed. */
export type AudioCompressor = (data: Buffer) => Promise<CompressedAudio>;

export const defaultAudioCompressor: AudioCompressor = (data) => compressMp3(data);

/** One mp3 field plus the `durationSec` measured by the browser. */
export function receiveAudio(field: string, maxBytes: number = MAX_MUSIC_BYTES): RequestHandler {
  return receiveFile({ field, maxBytes, maxFields: 1 });
}

/** Validates by magic bytes, compresses, stores, then deletes the file it replaces. */
export async function replaceAudio(
  storage: StorageProvider,
  compress: AudioCompressor,
  data: Buffer,
  previousKey: string | null,
  save: (stored: StoredFile) => Promise<void>,
): Promise<StoredFile> {
  if (!detectMp3(data)) throw new HttpError(400, 'Only mp3 files are allowed');
  const { data: compressed } = await compress(data);
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
    console.error(`[storage] could not delete replaced file ${key}`, error);
  });
}

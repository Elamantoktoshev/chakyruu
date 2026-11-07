import { spawn } from 'node:child_process';
import { HttpError } from '../lib/http.js';

/** MPEG-1/2 Layer III frame: 11 sync bits, then version and layer (layer bits 00 are reserved). */
function isMpegFrameHeader(data: Buffer): boolean {
  if (data.length < 4) return false;
  const [first, second] = data;
  const hasSync = first === 0xff && (second & 0xe0) === 0xe0;
  const layerBits = (second >> 1) & 0b11;
  return hasSync && layerBits !== 0b00;
}

/**
 * Real mp3 check by content: an ID3v2 tag or an MPEG audio frame at the start.
 * The client-sent MIME type and file name are ignored.
 */
export function detectMp3(data: Buffer): boolean {
  const ID3_HEADER_BYTES = 10;
  if (data.length >= ID3_HEADER_BYTES && data.toString('latin1', 0, 3) === 'ID3') return true;
  return isMpegFrameHeader(data);
}

/** Runs ffmpeg with `input` on stdin and resolves with stdout. Injectable for tests. */
export type FfmpegRunner = (input: Buffer, args: readonly string[]) => Promise<Buffer>;

const FFMPEG_TIMEOUT_MS = 60_000;

export function spawnFfmpeg(input: Buffer, args: readonly string[], command = 'ffmpeg'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], { stdio: ['pipe', 'pipe', 'pipe'], timeout: FFMPEG_TIMEOUT_MS });
    const output: Buffer[] = [];
    const errors: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => output.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => errors.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(output));
      else reject(new Error(`ffmpeg exited with ${code}: ${Buffer.concat(errors).toString().slice(0, 300)}`));
    });
    // ffmpeg may close stdin early on bad input; that surfaces through `close` above.
    child.stdin.on('error', () => undefined);
    child.stdin.end(input);
  });
}

/** Mono-agnostic 128 kbps mp3 without cover art or tags: small enough for 3G. */
const COMPRESS_ARGS = [
  '-hide_banner', '-loglevel', 'error',
  '-i', 'pipe:0',
  '-vn', '-map_metadata', '-1',
  '-codec:a', 'libmp3lame', '-b:a', '128k',
  '-f', 'mp3', 'pipe:1',
] as const;

let hasWarnedMissingFfmpeg = false;

export interface CompressedAudio {
  data: Buffer;
  isCompressed: boolean;
}

/**
 * Re-encodes an uploaded mp3 to 128 kbps. Without ffmpeg on the machine the original
 * (already validated, ≤ 10 MB) is kept, so uploads still work in development.
 */
export async function compressMp3(data: Buffer, run: FfmpegRunner = spawnFfmpeg): Promise<CompressedAudio> {
  try {
    const compressed = await run(data, COMPRESS_ARGS);
    const isSmaller = compressed.length > 0 && compressed.length < data.length;
    return isSmaller ? { data: compressed, isCompressed: true } : { data, isCompressed: false };
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      if (!hasWarnedMissingFfmpeg) {
        hasWarnedMissingFfmpeg = true;
        console.warn('[audio] ffmpeg is not installed: mp3 uploads are stored without compression');
      }
      return { data, isCompressed: false };
    }
    throw new HttpError(400, 'Could not read this mp3 file');
  }
}

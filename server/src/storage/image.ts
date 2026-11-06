export type ImageType = 'jpeg' | 'png' | 'webp';

export const IMAGE_CONTENT_TYPES: Readonly<Record<ImageType, string>> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const startsWith = (data: Buffer, bytes: readonly number[], offset = 0): boolean =>
  data.length >= offset + bytes.length && bytes.every((byte, i) => data[offset + i] === byte);

/**
 * Detects the real image type from magic bytes. The client-sent MIME type and file name
 * are ignored, so an SVG/HTML file renamed to .png is rejected.
 */
export function detectImageType(data: Buffer): ImageType | null {
  if (startsWith(data, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  // "RIFF" .... "WEBP"
  if (startsWith(data, [0x52, 0x49, 0x46, 0x46]) && startsWith(data, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp';
  return null;
}

import { describe, expect, it } from 'vitest';
import { TINY_PNG } from '../../test/app.js';
import { detectImageType } from './image.js';

describe('detectImageType', () => {
  it('recognises PNG, JPEG and WebP by their magic bytes', () => {
    expect(detectImageType(TINY_PNG)).toBe('png');
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe('jpeg');
    expect(detectImageType(Buffer.from('RIFF\x00\x00\x00\x00WEBPVP8 ', 'latin1'))).toBe('webp');
  });

  it('rejects SVG, HTML, GIF and truncated data', () => {
    for (const data of ['<svg onload="alert(1)"/>', '<html>', 'GIF89a', '\x89PN']) {
      expect(detectImageType(Buffer.from(data, 'latin1')), data).toBeNull();
    }
  });
});

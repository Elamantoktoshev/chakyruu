import { describe, expect, it } from 'vitest';
import { formatDuration, maxMusicStart, musicStartSchema, trackCreateSchema, trackIdSchema, uploadDurationSchema } from './index.js';

describe('music', () => {
  it('formats durations as m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(95)).toBe('1:35');
    expect(formatDuration(600.9)).toBe('10:00');
  });

  it('keeps the start point inside the song and the 10-minute cap', () => {
    expect(maxMusicStart(null)).toBe(600);
    expect(maxMusicStart(180)).toBe(175);
    expect(maxMusicStart(3)).toBe(0);
    expect(maxMusicStart(3000)).toBe(600);
  });

  it('accepts start seconds from 0 to 600 only', () => {
    expect(musicStartSchema.safeParse(0).success).toBe(true);
    expect(musicStartSchema.safeParse(600).success).toBe(true);
    expect(musicStartSchema.safeParse(601).success).toBe(false);
    expect(musicStartSchema.safeParse(1.5).success).toBe(false);
  });

  it('accepts only bundled /music/*.mp3 paths for tracks', () => {
    const base = { title: 'Комуз', category: 'ULUTTUK' };
    expect(trackCreateSchema.parse({ ...base, file: '/music/komuz-joy.mp3' }).file).toBe('/music/komuz-joy.mp3');
    expect(trackCreateSchema.parse(base).file).toBeNull();
    for (const file of ['/music/../.env', 'https://evil.example/a.mp3', '/music/a.wav', '/uploads/a.mp3']) {
      expect(trackCreateSchema.safeParse({ ...base, file }).success).toBe(false);
    }
  });

  it('validates track ids and the uploaded duration field', () => {
    expect(trackIdSchema.safeParse('komuz-joy').success).toBe(true);
    expect(trackIdSchema.safeParse('../x').success).toBe(false);
    expect(uploadDurationSchema.parse({ durationSec: '183' }).durationSec).toBe(183);
    expect(uploadDurationSchema.safeParse({ durationSec: '0' }).success).toBe(false);
  });
});

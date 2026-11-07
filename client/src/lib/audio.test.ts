// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fadeIn, measureDuration, seekWhenReady } from './audio';

function fakeAudio(overrides: Partial<{ readyState: number; duration: number }> = {}) {
  const audio = document.createElement('audio');
  Object.defineProperty(audio, 'readyState', { value: overrides.readyState ?? 0, configurable: true });
  Object.defineProperty(audio, 'duration', { value: overrides.duration ?? Number.NaN, configurable: true });
  return audio;
}

describe('fadeIn', () => {
  it('raises the volume from 0 to full over the given time', () => {
    const frames: ((time: number) => void)[] = [];
    const audio = fakeAudio();
    fadeIn(audio, 2000, (callback) => frames.push(callback));

    expect(audio.volume).toBe(0);
    frames.shift()?.(1000);
    expect(audio.volume).toBe(0);
    frames.shift()?.(2000); // halfway: ease-in keeps it quiet
    expect(audio.volume).toBeCloseTo(0.25);
    frames.shift()?.(3000);
    expect(audio.volume).toBe(1);
    expect(frames).toHaveLength(0);
  });

  it('can be cancelled', () => {
    const cancel = vi.fn();
    const stop = fadeIn(fakeAudio(), 2000, () => 7, cancel);
    stop();
    expect(cancel).toHaveBeenCalledWith(7);
  });
});

describe('seekWhenReady', () => {
  it('seeks right away when the duration is known', () => {
    const audio = fakeAudio({ readyState: 1, duration: 180 });
    seekWhenReady(audio, 35);
    expect(audio.currentTime).toBe(35);
  });

  it('waits for the metadata before seeking', () => {
    const audio = fakeAudio({ readyState: 0, duration: 180 });
    seekWhenReady(audio, 35);
    expect(audio.currentTime).toBe(0);
    audio.dispatchEvent(new Event('loadedmetadata'));
    expect(audio.currentTime).toBe(35);
  });

  it('starts from the beginning when the start is past the end of the song', () => {
    const audio = fakeAudio({ readyState: 1, duration: 30 });
    seekWhenReady(audio, 35);
    expect(audio.currentTime).toBe(0);
  });
});

describe('measureDuration', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:song');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('rounds the duration the browser reports', async () => {
    const audio = fakeAudio({ duration: 182.6 });
    const pending = measureDuration(new File(['x'], 'a.mp3'), () => audio);
    audio.dispatchEvent(new Event('loadedmetadata'));
    expect(await pending).toBe(183);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:song');
  });

  it('returns null when the file cannot be read', async () => {
    const audio = fakeAudio();
    const pending = measureDuration(new File(['x'], 'a.mp3'), () => audio);
    audio.dispatchEvent(new Event('error'));
    expect(await pending).toBeNull();
  });
});

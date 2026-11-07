// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { beforeSend, maskPath, track, trackOnce } from './analytics';

afterEach(() => {
  delete window.umami;
});

describe('maskPath', () => {
  it('hides invitation slugs and ids but keeps app routes', () => {
    expect(maskPath('/aibek-aizada')).toBe('/:slug');
    expect(maskPath('/create/clx123abc')).toBe('/create/:id');
    expect(maskPath('/dashboard')).toBe('/dashboard');
    expect(maskPath('/tamadalar')).toBe('/tamadalar');
    expect(maskPath('/')).toBe('/');
    expect(maskPath('/aibek-aizada?g=token')).toBe('/:slug?g=token');
  });
});

describe('beforeSend', () => {
  it('masks our own url and referrer, keeps only the origin of other sites', () => {
    const payload = beforeSend('event', {
      website: 'id',
      url: '/aibek-aizada',
      referrer: 'https://l.instagram.com/some/path?u=x',
      title: 'Chakyruu.kg',
    });
    expect(payload).toEqual({ website: 'id', url: '/:slug', referrer: 'https://l.instagram.com', title: 'Chakyruu.kg' });
  });
});

describe('track', () => {
  it('forwards events when Umami is loaded', () => {
    const umami = { track: vi.fn() };
    window.umami = umami;
    track('guest_rsvp', { attending: true });
    expect(umami.track).toHaveBeenCalledWith('guest_rsvp', { attending: true });
  });

  it('keeps early events until the deferred Umami script arrives', () => {
    vi.useFakeTimers();
    track('guest_opened', { personal: true });
    const umami = { track: vi.fn() };
    window.umami = umami;
    vi.advanceTimersByTime(500);
    expect(umami.track).toHaveBeenCalledWith('guest_opened', { personal: true });
    vi.useRealTimers();
  });

  it('drops queued events quietly when analytics never loads', () => {
    vi.useFakeTimers();
    expect(() => track('guest_opened')).not.toThrow();
    vi.advanceTimersByTime(20_000);
    const umami = { track: vi.fn() };
    window.umami = umami;
    vi.advanceTimersByTime(1000);
    expect(umami.track).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('trackOnce', () => {
  it('sends an event once per key in the session', () => {
    const umami = { track: vi.fn() };
    window.umami = umami;
    trackOnce('published:pay_1', 'published');
    trackOnce('published:pay_1', 'published');
    trackOnce('published:pay_2', 'published');
    expect(umami.track).toHaveBeenCalledTimes(2);
  });
});

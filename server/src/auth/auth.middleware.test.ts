import { describe, expect, it } from 'vitest';
import { normalizeOrigin } from './auth.middleware.js';

describe('normalizeOrigin', () => {
  it('reduces a configured URL to scheme://host:port', () => {
    expect(normalizeOrigin('http://localhost:5173/')).toBe('http://localhost:5173');
    expect(normalizeOrigin('https://chakyruu.kg/app')).toBe('https://chakyruu.kg');
    expect(normalizeOrigin('https://chakyruu.kg:443')).toBe('https://chakyruu.kg');
  });

  it('throws on a value that is not a URL', () => {
    expect(() => normalizeOrigin('chakyruu.kg')).toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { safeUrl } from './format';

describe('safeUrl', () => {
  it('keeps absolute http(s) URLs and same-site paths such as uploaded photos', () => {
    expect(safeUrl('https://2gis.kg/osh')).toBe('https://2gis.kg/osh');
    expect(safeUrl('/uploads/a9186af1-96f6-44dc-945e-7e20972449db.png')).toBe('/uploads/a9186af1-96f6-44dc-945e-7e20972449db.png');
  });

  it('blocks script, data and protocol-relative URLs', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,x', '//evil.example/x.png', '/\\evil.example', null, '']) {
      expect(safeUrl(url), String(url)).toBeUndefined();
    }
  });
});

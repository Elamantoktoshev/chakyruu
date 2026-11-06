import { describe, expect, it } from 'vitest';
import { safeNextPath } from './phone';

describe('safeNextPath', () => {
  it('allows in-app paths', () => {
    expect(safeNextPath('/aibek-aizada')).toBe('/aibek-aizada');
    expect(safeNextPath('/create?step=2')).toBe('/create?step=2');
  });

  it('falls back for missing, external or protocol-relative targets', () => {
    for (const next of [null, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)']) {
      expect(safeNextPath(next), String(next)).toBe('/');
    }
  });
});

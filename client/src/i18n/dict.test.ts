import { describe, expect, it } from 'vitest';
import { dictionaries } from './dict';

function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, nested]) => keyPaths(nested, prefix ? `${prefix}.${key}` : key));
}

describe('dictionaries', () => {
  it('have exactly the same keys in Kyrgyz and Russian', () => {
    expect(keyPaths(dictionaries.RU).sort()).toEqual(keyPaths(dictionaries.KY).sort());
  });

  it('have no empty translations', () => {
    for (const lang of ['KY', 'RU'] as const) {
      const empty = keyPaths(dictionaries[lang]).filter((path) => {
        const text = path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], dictionaries[lang]);
        return typeof text !== 'string' || text.trim() === '';
      });
      expect(empty, lang).toEqual([]);
    }
  });
});

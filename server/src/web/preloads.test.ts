import { describe, expect, it } from 'vitest';
import { collectPreloads, invitationModules, renderPreloadTags } from './preloads.js';

const MANIFEST = {
  'index.html': { file: 'assets/index-1.js', css: ['assets/index-1.css'], isEntry: true },
  'src/templates/classic/index.tsx': { file: 'assets/classic-2.js', imports: ['index.html', '_usePhoto-3.js', '_shared-4.js'] },
  'src/openings/scenes.tsx': { file: 'assets/scenes-5.js', imports: ['index.html', '_shared-4.js'], css: ['assets/scenes-5.css'] },
  '_usePhoto-3.js': { file: 'assets/usePhoto-3.js', imports: ['_shared-4.js'] },
  '_shared-4.js': { file: 'assets/shared-4.js' },
};

describe('collectPreloads', () => {
  it('lists the lazy chunks with their imports and CSS once, without the entry', () => {
    expect(collectPreloads(MANIFEST, ['src/templates/classic/index.tsx', 'src/openings/scenes.tsx'])).toEqual({
      scripts: ['/assets/classic-2.js', '/assets/usePhoto-3.js', '/assets/shared-4.js', '/assets/scenes-5.js'],
      styles: ['/assets/scenes-5.css'],
    });
  });

  it('ignores unknown modules', () => {
    expect(collectPreloads(MANIFEST, ['src/missing.tsx'])).toEqual({ scripts: [], styles: [] });
  });
});

describe('invitationModules', () => {
  it('picks the template chunk and the opening scenes when there is an animation', () => {
    expect(invitationModules('nazik', true)).toEqual(['src/templates/nazik/index.tsx', 'src/openings/scenes.tsx']);
    expect(invitationModules('../../etc', false)).toEqual(['src/templates/classic/index.tsx']);
  });
});

describe('renderPreloadTags', () => {
  it('renders modulepreload and style preload links', () => {
    expect(renderPreloadTags({ scripts: ['/assets/a.js'], styles: ['/assets/a.css'] })).toBe(
      '<link rel="preload" as="style" href="/assets/a.css" />\n    <link rel="modulepreload" crossorigin href="/assets/a.js" />',
    );
  });
});

// @vitest-environment jsdom
import { OPENING_PRESETS, type TemplateManifest } from '@chakyruu/shared';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LayeredScene, motionTransform } from './LayeredScene';

afterEach(cleanup);

const manifest = (kind: TemplateManifest['opening']['kind']): TemplateManifest => ({
  version: 1,
  slug: 'test-design',
  palette: { primary: '#5A1E2B', accent: '#C9A24B', background: '#FBF5EA', ink: '#2B1A14', card: '#F3E4E7', isDark: false },
  font: 'serif',
  opening: { kind, layers: [] },
  features: [],
  uploads: { 'seal.webp': 'https://cdn.example.com/templates/test-design/seal-1.webp' },
  placeholders: {},
});

describe('LayeredScene', () => {
  for (const kind of ['hands', 'branches', 'cloche', 'carpet', 'portrait'] as const) {
    it(`draws every "${kind}" layer, and a labelled placeholder when a file is missing`, () => {
      const { container } = render(<LayeredScene manifest={manifest(kind)} doorLabel="Асан байке" />);
      const motions = container.querySelectorAll('.layered-motion');
      expect(motions).toHaveLength(OPENING_PRESETS[kind].layers.length);
      for (const image of container.querySelectorAll('img')) fireEvent.error(image);
      for (const layer of OPENING_PRESETS[kind].layers) {
        expect(container.querySelector(`[data-placeholder="${layer.label}"]`), layer.id).not.toBeNull();
      }
    });
  }

  it('uses uploaded files before the shipped ones', () => {
    const { container } = render(<LayeredScene manifest={manifest('hands')} />);
    const sources = [...container.querySelectorAll('img')].map((image) => image.getAttribute('src'));
    expect(sources).toContain('https://cdn.example.com/templates/test-design/seal-1.webp');
    expect(sources).toContain('/templates/test-design/layers/hand-left.webp');
  });

  it('writes offsets in stage units so the scene scales with its container', () => {
    expect(motionTransform({ x: -60, y: 30 })).toBe('translate(-60cqw, 30cqh) rotate(0deg) scale(1)');
  });
});

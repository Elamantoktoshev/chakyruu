import { describe, expect, it } from 'vitest';
import { OPENING_PRESETS, assetSlots, assetUrl, openingLayers, requiredAssetFiles, type TemplateManifest } from './manifest.js';
import { parseManifest } from './manifest.schema.js';

const BASE = {
  version: 1,
  slug: 'ak-boz-uy',
  palette: { primary: '#7A1F2B', accent: '#C9A24B', background: '#FBF5EA', ink: '#2B1A14', card: '#F6E7EA', isDark: false },
  font: 'serif',
  opening: { kind: 'hands' },
  features: ['envelope', 'kyrgyz', 'map', 'rsvp', 'music'],
};

describe('parseManifest', () => {
  it('accepts a minimal manifest and fills defaults', () => {
    const manifest = parseManifest(BASE);
    expect(manifest.opening.layers).toEqual([]);
    expect(manifest.uploads).toEqual({});
    expect(manifest.placeholders).toEqual({});
  });

  it('rejects unknown opening kinds, bad colours and path tricks in file names', () => {
    expect(() => parseManifest({ ...BASE, opening: { kind: 'explode' } })).toThrow();
    expect(() => parseManifest({ ...BASE, palette: { ...BASE.palette, primary: 'red' } })).toThrow();
    expect(() => parseManifest({ ...BASE, opening: { kind: 'hands', layers: [{ id: 'x', file: '../../etc/passwd' }] } })).toThrow();
    expect(() => parseManifest({ ...BASE, uploads: { 'cover.webp': 'javascript:alert(1)' } })).toThrow();
    expect(() => parseManifest({ ...BASE, uploads: { 'cover.webp': 'http://cdn.example.com/x.webp' } })).toThrow();
    expect(() => parseManifest({ ...BASE, uploads: { 'cover.webp': '//evil.example.com/x.webp' } })).toThrow();
    expect(parseManifest({ ...BASE, uploads: { 'cover.webp': '/uploads/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed.webp' } }).uploads['cover.webp']).toMatch(/^\/uploads\//);
  });
});

describe('openingLayers', () => {
  it('uses the preset of the opening kind when the manifest has no layers', () => {
    const layers = openingLayers(parseManifest(BASE));
    expect(layers.map((layer) => layer.id)).toEqual(OPENING_PRESETS.hands.layers.map((layer) => layer.id));
  });

  it('lets the manifest override one preset layer by id and keeps the others', () => {
    const manifest = parseManifest({ ...BASE, opening: { kind: 'hands', layers: [{ id: 'hand-left', delayMs: 900 }] } });
    const layers = openingLayers(manifest);
    expect(layers.find((layer) => layer.id === 'hand-left')?.delayMs).toBe(900);
    expect(layers.find((layer) => layer.id === 'hand-left')?.file).toBe('layers/hand-left.webp');
    expect(layers).toHaveLength(OPENING_PRESETS.hands.layers.length);
  });

  it('has no layers for the built-in scenes (boz-uy, envelope, curtains, tunduk)', () => {
    expect(openingLayers(parseManifest({ ...BASE, opening: { kind: 'boz-uy' } }))).toEqual([]);
  });
});

describe('assetUrl', () => {
  it('prefers an uploaded file, then the file shipped in client/public/templates/<slug>/', () => {
    const manifest: TemplateManifest = parseManifest({ ...BASE, uploads: { 'cover.webp': 'https://cdn.example.com/templates/ak-boz-uy/cover-1a2b.webp' } });
    expect(assetUrl(manifest, 'cover.webp')).toBe('https://cdn.example.com/templates/ak-boz-uy/cover-1a2b.webp');
    expect(assetUrl(manifest, 'layers/hand-left.webp')).toBe('/templates/ak-boz-uy/layers/hand-left.webp');
  });
});

describe('requiredAssetFiles', () => {
  it('lists the cover, background and every layer the opening needs, once', () => {
    const files = requiredAssetFiles(parseManifest(BASE));
    expect(files).toContain('cover.webp');
    expect(files).toContain('bg.webp');
    expect(files).toContain('layers/hand-left.webp');
    expect(new Set(files).size).toBe(files.length);
  });
});

describe('assetSlots', () => {
  it('asks for transparency only on cut-out animation layers', () => {
    const slots = assetSlots(parseManifest(BASE));
    expect(slots.find((slot) => slot.file === 'cover.webp')).toMatchObject({ isCover: true, needsTransparency: false });
    expect(slots.find((slot) => slot.file === 'layers/backdrop.webp')?.needsTransparency).toBe(false);
    expect(slots.find((slot) => slot.file === 'layers/hand-left.webp')).toMatchObject({ label: 'Сол кол', needsTransparency: true });
    expect(slots.find((slot) => slot.file === 'seal.webp')?.needsTransparency).toBe(true);
  });
});

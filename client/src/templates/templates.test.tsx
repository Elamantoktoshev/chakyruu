// @vitest-environment jsdom
import { DRAWN_TEMPLATE_KEYS, TEMPLATE_CATALOG, resolvePalette } from '@chakyruu/shared';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { InvitationContent } from '../api/types';
import { LanguageProvider } from '../i18n/LanguageContext';
import { TEMPLATE_LOADERS } from './registry';

afterEach(cleanup);

/** First dynamic import of a template chunk can be slow while the whole suite runs in parallel. */
const RENDER_TIMEOUT_MS = 20_000;

function invitation(componentKey: string, paletteId: string | null, config: unknown = {}): InvitationContent {
  return {
    slug: 'aibek-aizada',
    hostNames: 'Айбек & Айзада',
    eventType: 'WEDDING',
    eventDate: '2030-06-15T11:00:00.000Z',
    venueName: '«Ала-Тоо» тойканасы',
    venueAddress: 'Ош ш.',
    venueMapUrl: 'https://2gis.kg/osh',
    photoUrl: null,
    musicTrackId: null,
    musicStartSec: 0,
    music: null,
    gallery: [],
    message: 'Кош келиңиздер!',
    language: 'KY',
    adultsOnly: true,
    paletteId,
    heroNumber: 60,
    openingAnimation: 'NONE',
    program: [],
    hideBranding: false,
    template: { id: 't', name: 'Ак боз үй', type: 'WEDDING', componentKey, isUniversal: false, config, priceSom: null, badge: null, description: {} },
  };
}

describe('templates', () => {
  for (const key of DRAWN_TEMPLATE_KEYS) {
    it(`"${key}" renders the invitation with every palette`, async () => {
      const { default: Template } = await TEMPLATE_LOADERS[key]();
      for (const palette of TEMPLATE_CATALOG[key].palettes) {
        render(
          <LanguageProvider>
            <Template invitation={invitation(key, palette.id)} palette={palette} mode="preview" slots={{}} />
          </LanguageProvider>,
        );
        expect(screen.getAllByText('Айбек & Айзада').length, `${key}/${palette.id}`).toBeGreaterThan(0);
        expect(screen.getByText('«Ала-Тоо» тойканасы')).toBeTruthy();
        expect(screen.getByText('Кош келиңиздер!')).toBeTruthy();
        cleanup();
      }
    }, RENDER_TIMEOUT_MS);
  }

  it('Юбилей shows the age in large numerals', async () => {
    const { default: Yubiley } = await TEMPLATE_LOADERS.yubiley();
    const [palette] = TEMPLATE_CATALOG.yubiley.palettes;
    render(
      <LanguageProvider>
        <Yubiley invitation={invitation('yubiley', palette!.id)} palette={palette!} mode="preview" slots={{}} />
      </LanguageProvider>,
    );
    expect(screen.getByText('60')).toBeTruthy();
  });
});

const MANIFEST = {
  version: 1,
  slug: 'test-design',
  palette: { primary: '#5A1E2B', accent: '#C9A24B', background: '#FBF5EA', ink: '#2B1A14', card: '#F3E4E7', isDark: false },
  font: 'serif',
  opening: { kind: 'hands', layers: [] },
  features: ['envelope', 'rsvp'],
  uploads: {},
  placeholders: {},
};

describe('illustrated template', () => {
  it('renders the shared invitation blocks in the manifest colours', async () => {
    const { default: Illustrated } = await TEMPLATE_LOADERS.illustrated();
    const palette = resolvePalette('illustrated', null, MANIFEST);
    expect(palette.primary).toBe('#5A1E2B');
    render(
      <LanguageProvider>
        <Illustrated invitation={invitation('illustrated', null, MANIFEST)} palette={palette} mode="preview" slots={{}} />
      </LanguageProvider>,
    );
    expect(screen.getAllByText('Айбек & Айзада').length).toBeGreaterThan(0);
    expect(screen.getByText('«Ала-Тоо» тойканасы')).toBeTruthy();
  }, RENDER_TIMEOUT_MS);

  it('shows a labelled placeholder while the cover artwork does not exist yet', async () => {
    const { default: Illustrated } = await TEMPLATE_LOADERS.illustrated();
    const { container } = render(
      <LanguageProvider>
        <Illustrated invitation={invitation('illustrated', null, MANIFEST)} palette={resolvePalette('illustrated', null, MANIFEST)} mode="preview" slots={{}} />
      </LanguageProvider>,
    );
    const cover = container.querySelector('header img');
    expect(cover?.getAttribute('src')).toBe('/templates/test-design/cover.webp');
    fireEvent.error(cover!);
    expect(container.querySelector('[data-placeholder="Ак боз үй"]')).not.toBeNull();
  }, RENDER_TIMEOUT_MS);

  it("shows the couple's photo when the owner uploaded one", async () => {
    const { default: Illustrated } = await TEMPLATE_LOADERS.illustrated();
    const withPhoto = { ...invitation('illustrated', null, MANIFEST), photoUrl: 'https://cdn.example.com/uploads/couple.webp' };
    render(
      <LanguageProvider>
        <Illustrated invitation={withPhoto} palette={resolvePalette('illustrated', null, MANIFEST)} mode="preview" slots={{}} />
      </LanguageProvider>,
    );
    expect(screen.getByAltText('Айбек & Айзада').getAttribute('src')).toBe('https://cdn.example.com/uploads/couple.webp');
  }, RENDER_TIMEOUT_MS);

  it('shows no photo frame without a photo', async () => {
    const { default: Illustrated } = await TEMPLATE_LOADERS.illustrated();
    render(
      <LanguageProvider>
        <Illustrated invitation={invitation('illustrated', null, MANIFEST)} palette={resolvePalette('illustrated', null, MANIFEST)} mode="preview" slots={{}} />
      </LanguageProvider>,
    );
    expect(screen.queryByAltText('Айбек & Айзада')).toBeNull();
  }, RENDER_TIMEOUT_MS);

  it('falls back to Classic when the manifest is broken', async () => {
    const { default: Illustrated } = await TEMPLATE_LOADERS.illustrated();
    const broken = { ...MANIFEST, version: 2 };
    render(
      <LanguageProvider>
        <Illustrated invitation={invitation('illustrated', null, broken)} palette={resolvePalette('illustrated', null, broken)} mode="preview" slots={{}} />
      </LanguageProvider>,
    );
    expect(screen.getAllByText('Айбек & Айзада').length).toBeGreaterThan(0);
  }, RENDER_TIMEOUT_MS);
});


// @vitest-environment jsdom
import { TEMPLATE_CATALOG, TEMPLATE_KEYS } from '@chakyruu/shared';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { InvitationContent } from '../api/types';
import { LanguageProvider } from '../i18n/LanguageContext';
import { TEMPLATE_LOADERS } from './registry';

afterEach(cleanup);

/** First dynamic import of a template chunk can be slow while the whole suite runs in parallel. */
const RENDER_TIMEOUT_MS = 20_000;

function invitation(componentKey: string, paletteId: string): InvitationContent {
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
    template: { id: 't', name: 't', type: 'WEDDING', componentKey, isUniversal: false, config: {} },
  };
}

describe('templates', () => {
  for (const key of TEMPLATE_KEYS) {
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

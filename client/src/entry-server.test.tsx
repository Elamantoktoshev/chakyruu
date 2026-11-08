// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { PublicPrice, Template } from './api/types';
import { render } from './entry-server';

const SITE = 'https://chakyruu.kg';

const TEMPLATES = [
  { id: 'tpl-1', name: 'Ак калпак', type: 'WEDDING', componentKey: 'classic', isUniversal: false, config: {}, priceSom: 499, badge: 'HIT', description: {} },
  { id: 'tpl-2', name: 'Кызыл кийиз', type: 'KYZ_UZATUU', componentKey: 'classic', isUniversal: false, config: {}, priceSom: 699, badge: null, description: {} },
] as unknown as Template[];
const PRICES = [{ code: 'INVITATION_PUBLISH', amountSom: 499, credits: null, audience: 'CLIENT' }] as unknown as PublicPrice[];

describe('server render of public pages', () => {
  it('renders the Kyrgyz home page with its head tags, without JavaScript', async () => {
    const { html, head, lang } = await render({ url: '/ky/', data: { templates: TEMPLATES, prices: PRICES }, siteUrl: SITE });

    expect(lang).toBe('ky');
    expect(html).toContain('<h1');
    expect(html).toContain('Ак калпак');
    expect(head).toContain('<title data-seo="">Той чакыруу онлайн');
    expect(head).toContain('<link data-seo="" rel="canonical" href="https://chakyruu.kg/ky/" />');
    expect(head).toContain('hreflang="ru" href="https://chakyruu.kg/ru/"');
    expect(head).toContain('hreflang="x-default" href="https://chakyruu.kg/ky/"');
    expect(head).toContain('property="og:image" content="https://chakyruu.kg/og-landing.png"');
  });

  it('renders the Russian template catalog with the designs from the server', async () => {
    const { html, head, lang } = await render({ url: '/ru/templates', data: { templates: TEMPLATES }, siteUrl: SITE });

    expect(lang).toBe('ru');
    expect(html).toContain('Кызыл кийиз');
    expect(head).toContain('Шаблоны приглашений');
    expect(head).toContain('rel="canonical" href="https://chakyruu.kg/ru/templates"');
    expect(head).toContain('property="og:locale" content="ru_RU"');
  });

  it('renders legal pages in the language of the URL', async () => {
    const { html, head } = await render({ url: '/ru/oferta', data: {}, siteUrl: SITE });
    expect(head).toContain('Публичная оферта');
    expect(html).toContain('<h1');
  });

  it('produces complete HTML without inline scripts (CSP forbids them) or unfinished Suspense boundaries', async () => {
    for (const url of ['/ky/', '/ru/templates', '/ky/tamadalar', '/ru/contacts']) {
      const { html } = await render({ url, data: { templates: TEMPLATES, prices: PRICES }, siteUrl: SITE });
      expect(html, url).not.toContain('<script');
      expect(html, url).not.toContain('<!--$?-->');
    }
  });

  it('keeps every title and description within search-result limits', async () => {
    const { PAGE_TEXTS } = await import('./seo/seoContent');
    for (const byLocale of Object.values(PAGE_TEXTS)) {
      for (const { title, description } of Object.values(byLocale)) {
        expect(title.length, title).toBeLessThanOrEqual(60);
        expect(description.length, description).toBeLessThanOrEqual(155);
      }
    }
  });
});

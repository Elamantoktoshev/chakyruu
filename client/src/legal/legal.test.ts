import { describe, expect, it } from 'vitest';
import { CONTACTS } from './contacts';
import { OFFER } from './offer';
import { PRIVACY } from './privacy';

describe('legal texts', () => {
  it('have the same structure in Kyrgyz and Russian', () => {
    for (const doc of [OFFER, PRIVACY, CONTACTS]) {
      expect(doc.KY.sections.length).toBe(doc.RU.sections.length);
      doc.KY.sections.forEach((section, index) => {
        expect(section.paragraphs.length, section.heading).toBe(doc.RU.sections[index]?.paragraphs.length);
      });
    }
  });

  it('name every processor the code actually uses in the privacy policy', () => {
    const text = JSON.stringify(PRIVACY.RU);
    for (const processor of ['Никита', 'DigitalOcean', 'Sentry', 'Umami', 'MBank']) expect(text).toContain(processor);
  });
});

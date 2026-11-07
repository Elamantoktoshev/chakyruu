import { describe, expect, it } from 'vitest';
import { integrationOrigins, integrationTags } from './integrations.js';

const BASE = { environment: 'production', umamiScriptUrl: 'https://cloud.umami.is/script.js' };

describe('integrations', () => {
  it('adds nothing when no keys are configured', () => {
    expect(integrationTags(BASE)).toBe('');
    expect(integrationOrigins(BASE)).toEqual({ scriptOrigins: [], connectOrigins: [] });
  });

  it('adds Sentry meta tags and the Umami script without query strings', () => {
    const config = { ...BASE, sentryDsn: 'https://abc@o1.ingest.de.sentry.io/42', release: 'f5d0ffd', umamiWebsiteId: '94db1cb1-74f4-4a40-ad6c-962362670409' };
    const tags = integrationTags(config);
    expect(tags).toContain('<meta name="sentry-dsn" content="https://abc@o1.ingest.de.sentry.io/42" />');
    expect(tags).toContain('<meta name="app-release" content="f5d0ffd" />');
    expect(tags).toContain('data-exclude-search="true"');
    expect(tags).toContain('data-before-send="chakyruuBeforeSend"');
    expect(integrationOrigins(config)).toEqual({
      scriptOrigins: ['https://cloud.umami.is'],
      connectOrigins: ['https://o1.ingest.de.sentry.io', 'https://cloud.umami.is', 'https://api-gateway.umami.dev'],
    });
  });

  it('escapes values', () => {
    expect(integrationTags({ ...BASE, umamiWebsiteId: '"><script>x</script>' })).not.toContain('<script>x');
  });
});

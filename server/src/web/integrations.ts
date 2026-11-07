import { escapeHtml } from './meta.js';

/** Umami Cloud sends events to this gateway (connect-src). */
const UMAMI_CLOUD_API = 'https://api-gateway.umami.dev';
/** Global function defined by the client (lib/analytics.ts) that hides invitation slugs. */
export const UMAMI_BEFORE_SEND = 'chakyruuBeforeSend';

export interface BrowserIntegrations {
  /** Sentry DSN for the browser; empty → no error tracking. */
  sentryDsn?: string;
  environment: string;
  release?: string;
  /** Umami website id; empty → no analytics. */
  umamiWebsiteId?: string;
  umamiScriptUrl: string;
}

const originOf = (url: string): string => new URL(url).origin;

/**
 * Tags added to every page: Sentry settings as <meta> (read by the client bundle, CSP-safe) and
 * the Umami script. Cookieless analytics; query strings (guest tokens) are never sent.
 */
export function integrationTags(config: BrowserIntegrations): string {
  const meta = (name: string, value: string) => `<meta name="${name}" content="${escapeHtml(value)}" />`;
  return [
    ...(config.sentryDsn ? [meta('sentry-dsn', config.sentryDsn), meta('sentry-environment', config.environment)] : []),
    ...(config.sentryDsn && config.release ? [meta('app-release', config.release)] : []),
    ...(config.umamiWebsiteId
      ? [
          `<script defer src="${escapeHtml(config.umamiScriptUrl)}" data-website-id="${escapeHtml(config.umamiWebsiteId)}" ` +
            `data-exclude-search="true" data-exclude-hash="true" data-before-send="${UMAMI_BEFORE_SEND}"></script>`,
        ]
      : []),
  ].join('\n    ');
}

/** Origins the CSP must allow for these integrations. */
export function integrationOrigins(config: BrowserIntegrations): { scriptOrigins: string[]; connectOrigins: string[] } {
  const sentry = config.sentryDsn ? [originOf(config.sentryDsn)] : [];
  const umamiScript = config.umamiWebsiteId ? [originOf(config.umamiScriptUrl)] : [];
  const umamiApi = config.umamiWebsiteId ? [UMAMI_CLOUD_API] : [];
  return {
    scriptOrigins: umamiScript,
    connectOrigins: [...new Set([...sentry, ...umamiScript, ...umamiApi])],
  };
}

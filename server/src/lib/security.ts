import type { RequestHandler } from 'express';
import helmet from 'helmet';

/**
 * Control characters (except tab and line breaks), zero-width spaces, byte-order marks and the
 * bidi overrides used to disguise text ("Trojan Source"). The zero-width joiner U+200D stays:
 * emoji sequences need it.
 */
const INVISIBLE_OR_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​‎‏‪-‮⁦-⁩﻿]/g;

/** Text from users, as it should be stored: NFC-normalized, without invisible or control characters. */
export function cleanText(value: string): string {
  return value.normalize('NFC').replace(INVISIBLE_OR_CONTROL, '');
}

function cleanValue(value: unknown): unknown {
  if (typeof value === 'string') return cleanText(value);
  if (Array.isArray(value)) return value.map(cleanValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cleanValue(item)]));
  }
  return value;
}

/**
 * Cleans every string of a JSON body before validation, so all forms (names, wishes, programme,
 * partner profiles) get the same treatment. Lengths are limited by the zod schemas; HTML is never
 * rendered from user text (React escapes it), so no HTML filtering is needed.
 */
export const sanitizeJsonBody: RequestHandler = (req, _res, next) => {
  if (req.body !== undefined && req.is('application/json')) req.body = cleanValue(req.body);
  next();
};

export interface SecurityHeadersOptions {
  isProduction: boolean;
  /** Where photos and music are served from besides this site (the Spaces CDN). */
  mediaOrigins?: readonly string[];
  /** Extra script / connect origins (analytics, error tracking). */
  scriptOrigins?: readonly string[];
  connectOrigins?: readonly string[];
}

const ONE_YEAR_SECONDS = 31_536_000;

/**
 * helmet with a Content-Security-Policy for the React app: only our own scripts, images and
 * music from this site or the CDN, no framing. Fonts are self-hosted; 2GIS is only linked.
 */
export function securityHeaders({ isProduction, mediaOrigins = [], scriptOrigins = [], connectOrigins = [] }: SecurityHeadersOptions): RequestHandler {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", ...scriptOrigins],
        // Tailwind classes need nothing inline, but some components set style attributes.
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', ...mediaOrigins],
        // blob: — the builder reads the length of an mp3 before uploading it.
        mediaSrc: ["'self'", 'blob:', ...mediaOrigins],
        fontSrc: ["'self'"],
        connectSrc: ["'self'", ...connectOrigins],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    // Invitation pictures and uploads may be shown by other sites (link previews).
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    strictTransportSecurity: isProduction ? { maxAge: ONE_YEAR_SECONDS, includeSubDomains: false } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
}

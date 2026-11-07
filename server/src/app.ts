import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import { loadUser, requireSameOrigin } from './auth/auth.middleware.js';
import { createAuthRouter } from './auth/auth.routes.js';
import { createAuthService } from './auth/auth.service.js';
import type { SmsProvider } from './auth/sms.js';
import { createPublicInvitationRouter } from './invitations/invitation.routes.js';
import { createMyInvitationsRouter } from './invitations/my.routes.js';
import { errorHandler, notFoundHandler, sendOk } from './lib/http.js';
import { createHealthHandler } from './lib/health.js';
import { resolveClientIp } from './lib/clientIp.js';
import { sanitizeJsonBody, securityHeaders } from './lib/security.js';
import { createAdminRouter } from './admin/admin.routes.js';
import { createCatalogRouter } from './catalog/catalog.routes.js';
import { myGiftRouter } from './gifts/gift.routes.js';
import { createPartnerLeadRouter } from './partners/lead.routes.js';
import { createPartnerCabinetRouter } from './partners/partner.routes.js';
import type { PaymentGateway } from './payments/gateway.js';
import { createMyPaymentsRouter, createWebhookRouter } from './payments/payment.routes.js';
import { listPublicPrices } from './pricing/price.service.js';
import { defaultAudioCompressor, type AudioCompressor } from './storage/audioUpload.js';
import type { StorageProvider } from './storage/storage.provider.js';
import { createPublicTrackRouter } from './music/track.routes.js';
import { createOgRouter } from './og/og.routes.js';
import { createPictureRenderer } from './og/og.service.js';
import { createWebRouter } from './web/spa.js';
import { templateRouter } from './templates/template.routes.js';
import { createTilekLikeRouter } from './tilek/tilek.routes.js';

const UPLOADS_MAX_AGE = '7d';
/** Fits a pasted guest list of 20 000 Cyrillic characters (2 bytes each in UTF-8). */
const JSON_BODY_LIMIT = '64kb';

export interface AppConfig {
  corsOrigin: string;
  otpSecret: string;
  isProduction: boolean;
  sms: SmsProvider;
  storage: StorageProvider;
  payments: PaymentGateway;
  /** Public site URL for payment return links; defaults to corsOrigin. */
  appUrl?: string;
  /** Directory served at /uploads (local storage only). */
  uploadsDir?: string;
  /** Reverse-proxy hops in front of the API (Express `trust proxy`). Defaults to 1. */
  trustProxyHops?: number;
  /** Injectable clock (tests use it to expire codes and sessions). */
  now?: () => Date;
  /** Origins photos and music are served from besides this site (Spaces CDN), for the CSP. */
  mediaOrigins?: readonly string[];
  /** Header with the real client IP set by the hosting edge (DigitalOcean: do-connecting-ip). */
  clientIpHeader?: string;
  /** Git commit of the running build (shown by /api/health). */
  commitSha?: string;
  /** Built React app (client/dist). When set, the API also serves the site and invitation previews. */
  clientDir?: string;
  /** mp3 re-encoding (ffmpeg); tests pass a no-op so they do not depend on ffmpeg. */
  compressAudio?: AudioCompressor;
  /** Demo numbers with a fixed login code and no SMS (TEST_LOGIN_PHONES). */
  testLoginPhones?: ReadonlyMap<string, string>;
  /** Most SMS the site may send per 24 h. */
  smsDailyLimit?: number;
  /** DEV_LOGIN_WITHOUT_SMS: the login code is returned to the browser. Refused in production by index.ts. */
  exposeOtpInResponse?: boolean;
}

export function createApp(config: AppConfig): Express {
  const { corsOrigin, otpSecret, isProduction, sms, storage, payments, uploadsDir, trustProxyHops = 1, now } = config;
  const compressAudio = config.compressAudio ?? defaultAudioCompressor;
  const checkout = { gateway: payments, appUrl: config.appUrl ?? corsOrigin };
  const app = express();
  const auth = createAuthService({
    otpSecret,
    sms,
    now,
    exposeOtpInResponse: config.exposeOtpInResponse && !isProduction,
    testLoginPhones: config.testLoginPhones,
    smsDailyLimit: config.smsDailyLimit,
  });

  app.disable('x-powered-by');
  // gzip for HTML, JS, CSS and JSON (images and mp3 are already compressed and skipped).
  app.use(compression());
  app.use(securityHeaders({ isProduction, mediaOrigins: config.mediaOrigins }));
  app.set('trust proxy', trustProxyHops);
  app.use(resolveClientIp(config.clientIpHeader));

  if (uploadsDir) {
    app.use(
      '/uploads',
      express.static(uploadsDir, {
        index: false,
        dotfiles: 'deny',
        maxAge: UPLOADS_MAX_AGE,
        setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
      }),
    );
  }

  // Provider webhooks need the raw body (signature) and come without an Origin: mount before JSON/CSRF.
  app.use('/api/payments/webhook', createWebhookRouter(payments));

  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(sanitizeJsonBody);
  app.use(cookieParser());
  app.use(requireSameOrigin(corsOrigin));
  app.use(loadUser(auth));

  app.get('/api/health', createHealthHandler(config.commitSha));
  app.use('/api/auth', createAuthRouter({ auth, isProduction }));
  app.use('/api/public/templates', templateRouter);
  app.use('/api/public/invitations', createPublicInvitationRouter({ appUrl: checkout.appUrl }));
  app.use('/api/public/tilekter', createTilekLikeRouter());
  app.use('/api/public/partner-leads', createPartnerLeadRouter());
  app.use('/api/public/tracks', createPublicTrackRouter());
  app.use('/api/public', createCatalogRouter());
  app.get('/api/public/prices', async (_req, res) => sendOk(res, await listPublicPrices()));
  app.use('/api/my/invitations', createMyInvitationsRouter({ storage, checkout, compressAudio }));
  app.use('/api/my/gifts', myGiftRouter);
  app.use('/api/my/payments', createMyPaymentsRouter(payments));
  app.use('/api/partner', createPartnerCabinetRouter({ storage, checkout }));
  app.use('/api/admin', createAdminRouter({ storage, compress: compressAudio }));
  app.use('/api/og', createOgRouter({ renderer: createPictureRenderer({ appUrl: checkout.appUrl }), appUrl: checkout.appUrl }));

  if (config.clientDir) app.use(createWebRouter({ clientDir: config.clientDir, appUrl: checkout.appUrl }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

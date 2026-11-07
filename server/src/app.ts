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
import { createAdminRouter } from './admin/admin.routes.js';
import { createCatalogRouter } from './catalog/catalog.routes.js';
import { myGiftRouter } from './gifts/gift.routes.js';
import { createPartnerLeadRouter } from './partners/lead.routes.js';
import { createPartnerCabinetRouter } from './partners/partner.routes.js';
import type { PaymentGateway } from './payments/gateway.js';
import { createMyPaymentsRouter, createWebhookRouter } from './payments/payment.routes.js';
import { listPublicPrices } from './pricing/price.service.js';
import type { StorageProvider } from './storage/storage.provider.js';
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
  /** DEV_LOGIN_WITHOUT_SMS: the login code is returned to the browser. Refused in production by index.ts. */
  exposeOtpInResponse?: boolean;
}

export function createApp(config: AppConfig): Express {
  const { corsOrigin, otpSecret, isProduction, sms, storage, payments, uploadsDir, trustProxyHops = 1, now } = config;
  const checkout = { gateway: payments, appUrl: config.appUrl ?? corsOrigin };
  const app = express();
  const auth = createAuthService({ otpSecret, sms, now, exposeOtpInResponse: config.exposeOtpInResponse && !isProduction });

  app.disable('x-powered-by');
  app.set('trust proxy', trustProxyHops);

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
  app.use(cookieParser());
  app.use(requireSameOrigin(corsOrigin));
  app.use(loadUser(auth));

  app.get('/api/health', (_req, res) => sendOk(res, { status: 'ok' }));
  app.use('/api/auth', createAuthRouter({ auth, isProduction }));
  app.use('/api/public/templates', templateRouter);
  app.use('/api/public/invitations', createPublicInvitationRouter({ appUrl: checkout.appUrl }));
  app.use('/api/public/tilekter', createTilekLikeRouter());
  app.use('/api/public/partner-leads', createPartnerLeadRouter());
  app.use('/api/public', createCatalogRouter());
  app.get('/api/public/prices', async (_req, res) => sendOk(res, await listPublicPrices()));
  app.use('/api/my/invitations', createMyInvitationsRouter({ storage, checkout }));
  app.use('/api/my/gifts', myGiftRouter);
  app.use('/api/my/payments', createMyPaymentsRouter(payments));
  app.use('/api/partner', createPartnerCabinetRouter({ storage, checkout }));
  app.use('/api/admin', createAdminRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

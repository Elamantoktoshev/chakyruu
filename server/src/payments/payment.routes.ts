import { z } from 'zod';
import express, { Router } from 'express';
import { currentUser, requireAuth } from '../auth/auth.middleware.js';
import { HttpError, sendOk } from '../lib/http.js';
import { rateLimit } from '../lib/rateLimit.js';
import { prisma } from '../lib/prisma.js';
import { fulfillPayment, markPaymentFailed } from './fulfill.service.js';
import { WebhookRejected, type PaymentGateway } from './gateway.js';
import { getPaymentStatus } from './status.service.js';

const WEBHOOK_BODY_LIMIT = '64kb';
/** Providers retry a few times; anything far above this is noise or an attack. */
const WEBHOOKS_PER_MINUTE = 300;
const MINUTE_MS = 60 * 1000;
const paymentParams = z.object({ id: z.string().min(1).max(40) });
const webhookParams = z.object({ gateway: z.string().min(1).max(20) });

/** Mounted at /api/my/payments — the payer polls the status after returning from the provider. */
export function createMyPaymentsRouter(gateway: PaymentGateway): Router {
  const router = Router();
  router.use(requireAuth);
  router.get('/:id', async (req, res) => {
    sendOk(res, await getPaymentStatus(paymentParams.parse(req.params).id, currentUser(res), gateway));
  });
  return router;
}

/**
 * Mounted at /api/payments/webhook BEFORE express.json: the signature is computed over the raw body.
 * Fulfilment is idempotent, so provider retries are harmless.
 */
export function createWebhookRouter(gateway: PaymentGateway): Router {
  const router = Router();
  router.post('/:gateway', rateLimit({ windowMs: MINUTE_MS, max: WEBHOOKS_PER_MINUTE }), express.raw({ type: () => true, limit: WEBHOOK_BODY_LIMIT }), async (req, res) => {
    const { gateway: gatewayId } = webhookParams.parse(req.params);
    if (gatewayId !== gateway.id) throw new HttpError(404, 'Unknown payment gateway');

    let event;
    try {
      const headers = Object.fromEntries(Object.entries(req.headers).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
      event = await gateway.parseWebhook({ headers, rawBody: Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0) });
    } catch (error: unknown) {
      if (error instanceof WebhookRejected || error instanceof SyntaxError) {
        console.warn(`[payments] rejected ${gateway.id} webhook: ${error.message}`);
        throw new HttpError(401, 'Webhook rejected');
      }
      throw error;
    }

    const payment = await prisma.payment.findUnique({
      where: { gateway_externalId: { gateway: gateway.id, externalId: event.externalId } },
      select: { id: true },
    });
    if (!payment) throw new HttpError(404, 'Payment not found');
    if (event.status === 'SUCCEEDED') await fulfillPayment(payment.id, { raw: event.raw });
    if (event.status === 'FAILED') await markPaymentFailed(payment.id, event.raw);
    sendOk(res, { received: true });
  });
  return router;
}

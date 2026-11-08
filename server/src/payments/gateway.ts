import type { PaymentProviderId } from '@chakyruu/shared';

export const GATEWAY_IDS = ['fake', 'manual', 'mbank', 'odengi', 'elsom'] as const;
export type GatewayId = (typeof GATEWAY_IDS)[number];

export interface CheckoutRequest {
  paymentId: string;
  amountTyiyn: number;
  /** Method the payer picked in the UI. */
  method: PaymentProviderId;
  description: string;
  /** Short unique code: provider order id, and how the admin finds the payment. */
  reference: string;
  /** What a person writes in a manual transfer comment: names and the toy day. */
  comment: string;
  /** Where the provider sends the payer back to (our /pay/result page). */
  returnUrl: string;
}

export interface ManualInstructions {
  /** The bank the payer picked; the page names it and shows our number there. */
  bank: PaymentProviderId;
  receiver: string;
  /** Names + day for the transfer comment (shown to the payer). */
  comment: string;
  reference: string;
  amountSom: number;
}

/**
 * What the payer has to do next:
 * - completed: already paid (fake gateway in development)
 * - redirect: open the provider's payment page
 * - qr: scan a QR in the bank app (payload is the QR content)
 * - manual: transfer by hand with the reference in the comment; an admin confirms it
 */
export type CheckoutResult =
  | { kind: 'completed'; externalId: string }
  | { kind: 'redirect'; externalId: string; url: string }
  | { kind: 'qr'; externalId: string; qrPayload: string; url?: string }
  | { kind: 'manual'; externalId: string; instructions: ManualInstructions };

export type GatewayPaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';

export interface WebhookInput {
  headers: Readonly<Record<string, string | undefined>>;
  rawBody: Buffer;
}

export interface WebhookEvent {
  externalId: string;
  status: GatewayPaymentStatus;
  /** Stored on the payment for audits / disputes. */
  raw: unknown;
}

export interface PaymentGateway {
  readonly id: GatewayId;
  createPayment(request: CheckoutRequest): Promise<CheckoutResult>;
  /** Must verify the signature and throw `WebhookRejected` when it does not match. */
  parseWebhook(input: WebhookInput): Promise<WebhookEvent>;
  checkStatus(externalId: string): Promise<GatewayPaymentStatus>;
}

/** Thrown by gateways for an unverifiable webhook; answered with 401 and never fulfils anything. */
export class WebhookRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookRejected';
  }
}

/** Thrown by provider skeletons until the real API integration is written. */
export class GatewayNotImplemented extends Error {
  constructor(gateway: GatewayId, operation: string) {
    super(`${gateway}: ${operation} is not implemented yet — see README "Платежи"`);
    this.name = 'GatewayNotImplemented';
  }
}

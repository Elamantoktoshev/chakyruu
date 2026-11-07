import { logger } from '../lib/logger.js';
import { NikitaError } from './nikita.provider.js';
import { maskPhone } from './sms.js';

/** Shown to the user whenever the login SMS could not be sent, whatever the cause. */
export const SMS_FAILED_USER_MESSAGE = 'Код жөнөтүлгөн жок, кайра аракет кылыңыз';

/**
 * Logs why an SMS failed in terms an admin can act on (kind + hint), with the phone masked.
 * Credentials never reach this point: NikitaError carries only status, kind and a masked detail.
 */
export function logSmsFailure(phone: string, error: unknown): void {
  const to = maskPhone(phone);
  if (error instanceof NikitaError) {
    logger.error(
      { sms: { provider: 'nikita', kind: error.kind, status: error.status, hint: error.hint }, err: error },
      `[sms] delivery failed for ${to}: ${error.kind} — ${error.hint}`,
    );
    return;
  }
  logger.error({ sms: { kind: 'unknown' }, err: error }, `[sms] delivery failed for ${to}`);
}

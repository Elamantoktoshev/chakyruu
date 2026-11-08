import { logger } from '../lib/logger.js';
import { formatAdminMessage, type AdminEvent } from './adminEvents.js';
import type { MessageSender } from './telegram.js';

/** One alert per SMS problem kind per hour: a broken gateway would otherwise flood the chat. */
const SMS_PROBLEM_COOLDOWN_MS = 60 * 60 * 1000;

interface NotifierConfig {
  send: MessageSender;
  appUrl: string;
  now?: () => number;
}

interface NotifierState {
  config: NotifierConfig | null;
  lastSmsAlert: ReadonlyMap<string, number>;
  inFlight: ReadonlySet<Promise<void>>;
}

const EMPTY_STATE: NotifierState = { config: null, lastSmsAlert: new Map(), inFlight: new Set() };
let state: NotifierState = EMPTY_STATE;

/** Called once at startup when Telegram is set up; until then notifications are silently skipped. */
export function configureAdminNotifier(config: NotifierConfig): void {
  state = { ...EMPTY_STATE, config };
}

/** Tests only. */
export function resetAdminNotifier(): void {
  state = EMPTY_STATE;
}

function isThrottled(event: AdminEvent, now: number): boolean {
  if (event.type !== 'sms_problem') return false;
  const last = state.lastSmsAlert.get(event.kind);
  if (last !== undefined && now - last < SMS_PROBLEM_COOLDOWN_MS) return true;
  state = { ...state, lastSmsAlert: new Map(state.lastSmsAlert).set(event.kind, now) };
  return false;
}

/**
 * Fire-and-forget: the caller (login, payment, publish) never waits for Telegram and never fails
 * because of it. Delivery problems are logged as warnings.
 */
export function notifyAdmin(event: AdminEvent): void {
  const { config } = state;
  if (!config) return;
  if (isThrottled(event, (config.now ?? Date.now)())) return;

  const delivery: Promise<void> = config
    .send(formatAdminMessage(event, config.appUrl))
    .catch((error: unknown) => {
      logger.warn({ event: event.type }, `[notify] Telegram message not sent: ${error instanceof Error ? error.message : String(error)}`);
    })
    .finally(() => {
      const rest = new Set(state.inFlight);
      rest.delete(delivery);
      state = { ...state, inFlight: rest };
    });
  state = { ...state, inFlight: new Set(state.inFlight).add(delivery) };
}

/** Waits for messages still being sent (graceful shutdown, tests). */
export async function flushAdminNotifications(): Promise<void> {
  await Promise.all(state.inFlight);
}

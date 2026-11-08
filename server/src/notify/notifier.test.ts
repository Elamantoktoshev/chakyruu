import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../lib/logger.js';
import { configureAdminNotifier, flushAdminNotifications, notifyAdmin, resetAdminNotifier } from './notifier.js';

afterEach(() => {
  resetAdminNotifier();
  vi.restoreAllMocks();
});

describe('notifyAdmin', () => {
  it('does nothing until a channel is configured', async () => {
    notifyAdmin({ type: 'user_registered', phone: '+996700123456' });
    await expect(flushAdminNotifications()).resolves.toBeUndefined();
  });

  it('sends formatted events through the configured channel', async () => {
    const send = vi.fn(async () => undefined);
    configureAdminNotifier({ send, appUrl: 'https://chakyruu.kg' });
    notifyAdmin({ type: 'user_registered', phone: '+996700123456' });
    await flushAdminNotifications();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toContain('+996*******56');
  });

  it('never throws into the caller when the channel fails, and logs a warning', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    configureAdminNotifier({ send: vi.fn(async () => Promise.reject(new Error('telegram down'))), appUrl: 'https://chakyruu.kg' });
    expect(() => notifyAdmin({ type: 'user_registered', phone: '+996700123456' })).not.toThrow();
    await flushAdminNotifications();
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'user_registered' }), expect.stringContaining('telegram down'));
  });

  it('sends the same SMS problem at most once per hour', async () => {
    let now = 0;
    const send = vi.fn(async () => undefined);
    configureAdminNotifier({ send, appUrl: 'https://chakyruu.kg', now: () => now });
    notifyAdmin({ type: 'sms_problem', kind: 'funds', hint: 'top up' });
    notifyAdmin({ type: 'sms_problem', kind: 'funds', hint: 'top up' });
    notifyAdmin({ type: 'sms_problem', kind: 'auth', hint: 'check login' });
    now += 61 * 60 * 1000;
    notifyAdmin({ type: 'sms_problem', kind: 'funds', hint: 'top up' });
    await flushAdminNotifications();
    expect(send).toHaveBeenCalledTimes(3);
  });
});

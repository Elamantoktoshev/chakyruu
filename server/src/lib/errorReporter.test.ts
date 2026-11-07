import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { scrubEvent, type ErrorReporter } from './errorReporter.js';
import { createErrorHandler, HttpError } from './http.js';

describe('scrubEvent', () => {
  it('drops cookies, headers, bodies and the user, masks phones and guest tokens', () => {
    const scrubbed = scrubEvent({
      message: 'SMS to +996700123456 failed',
      request: { cookies: { sid: 'secret' }, headers: { cookie: 'sid=secret' }, data: { phone: '+996700123456' }, query_string: 'g=tok', url: 'https://x/aibek?g=tok' },
      exception: { values: [{ value: 'Nikita.kg rejected 996555000111' }] },
      user: { ip_address: '1.2.3.4' },
    });
    expect(scrubbed).toEqual({
      message: 'SMS to +996*******56 failed',
      request: { url: 'https://x/aibek?g=[redacted]' },
      exception: { values: [{ value: 'Nikita.kg rejected +996*******11' }] },
    });
  });
});

describe('createErrorHandler', () => {
  function appThatThrows(error: unknown, reporter: ErrorReporter) {
    const app = express();
    app.get('/boom', () => {
      throw error;
    });
    app.use(createErrorHandler(reporter));
    return app;
  }

  it('reports unexpected errors and answers 500 without details', async () => {
    const reporter = { capture: vi.fn() };
    const res = await request(appThatThrows(new Error('db password=hunter2'), reporter)).get('/boom').expect(500);
    expect(res.body.error.message).toBe('Internal server error');
    expect(reporter.capture).toHaveBeenCalledTimes(1);
    expect(reporter.capture.mock.calls[0]?.[1]).toMatchObject({ method: 'GET', path: '/boom' });
  });

  it('does not report expected client errors', async () => {
    const reporter = { capture: vi.fn() };
    await request(appThatThrows(new HttpError(404, 'Not found'), reporter)).get('/boom').expect(404);
    expect(reporter.capture).not.toHaveBeenCalled();
  });
});

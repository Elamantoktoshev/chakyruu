import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { clientIp, resolveClientIp } from './clientIp.js';

function appWith(header?: string) {
  const app = express();
  app.use(resolveClientIp(header));
  app.get('/', (req, res) => res.send(clientIp(req)));
  return app;
}

describe('clientIp', () => {
  it('uses the configured edge header', async () => {
    const res = await request(appWith('do-connecting-ip')).get('/').set('DO-Connecting-IP', '92.62.70.5');
    expect(res.text).toBe('92.62.70.5');
  });

  it('ignores malformed header values and falls back to the socket address', async () => {
    const res = await request(appWith('do-connecting-ip')).get('/').set('do-connecting-ip', 'bucket-of-my-choice');
    expect(res.text).not.toBe('bucket-of-my-choice');
  });

  it('does not read any header unless configured', async () => {
    const res = await request(appWith()).get('/').set('do-connecting-ip', '92.62.70.5');
    expect(res.text).not.toBe('92.62.70.5');
  });
});

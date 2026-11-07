import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { cleanText, sanitizeJsonBody, securityHeaders } from './security.js';

describe('cleanText', () => {
  it('removes control, zero-width and bidi characters but keeps line breaks, Kyrgyz letters and emoji', () => {
    expect(cleanText('Асан\u0000 байке​‮')).toBe('Асан байке');
    expect(cleanText('Үңкүр\nӨрнөк\tтой')).toBe('Үңкүр\nӨрнөк\tтой');
    expect(cleanText('👨‍👩‍👧')).toBe('👨‍👩‍👧');
  });

  it('normalizes decomposed letters', () => {
    expect(cleanText('Ӱ')).toBe('Ӱ');
  });
});

describe('sanitizeJsonBody', () => {
  it('cleans every string of a nested JSON body', async () => {
    const app = express();
    app.use(express.json(), sanitizeJsonBody);
    app.post('/', (req, res) => res.json(req.body));
    const res = await request(app)
      .post('/')
      .send({ name: 'Айгүл‮эже', program: [{ time: '18:00', title: 'Той\u0007' }], count: 2, ok: true });
    expect(res.body).toEqual({ name: 'Айгүлэже', program: [{ time: '18:00', title: 'Той' }], count: 2, ok: true });
  });
});

describe('securityHeaders', () => {
  it('sends a CSP that allows the CDN for media, plus the usual protections', async () => {
    const app = express();
    app.use(securityHeaders({ isProduction: true, mediaOrigins: ['https://chakyruu.fra1.cdn.digitaloceanspaces.com'] }));
    app.get('/', (_req, res) => res.send('ok'));
    const res = await request(app).get('/');
    const csp = res.headers['content-security-policy'] as string;
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("img-src 'self' data: blob: https://chakyruu.fra1.cdn.digitaloceanspaces.com");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('does not send HSTS in development', async () => {
    const app = express();
    app.use(securityHeaders({ isProduction: false }));
    app.get('/', (_req, res) => res.send('ok'));
    expect((await request(app).get('/')).headers['strict-transport-security']).toBeUndefined();
  });
});

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { safeNextPath } from './auth.routes.js';
import { createGoogleAttempt, createGoogleOAuth } from './google.js';

describe('createGoogleAttempt', () => {
  it('derives the PKCE challenge as base64url(sha256(verifier))', () => {
    const { codeVerifier, codeChallenge } = createGoogleAttempt();
    expect(codeChallenge).toBe(createHash('sha256').update(codeVerifier).digest('base64url'));
    expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
  });

  it('uses a fresh random state every time', () => {
    expect(createGoogleAttempt().state).not.toBe(createGoogleAttempt().state);
  });
});

describe('createGoogleOAuth', () => {
  it('asks Google for the account picker with PKCE and our callback', () => {
    const google = createGoogleOAuth({
      clientId: 'abc.apps.googleusercontent.com',
      clientSecret: 'secret',
      redirectUri: 'https://chakyruu.kg/api/auth/google/callback',
    });
    const url = new URL(google.authorizationUrl({ state: 'st', codeChallenge: 'ch' }));
    expect(url.hostname).toBe('accounts.google.com');
    expect(url.searchParams.get('client_id')).toBe('abc.apps.googleusercontent.com');
    expect(url.searchParams.get('redirect_uri')).toBe('https://chakyruu.kg/api/auth/google/callback');
    expect(url.searchParams.get('state')).toBe('st');
    expect(url.searchParams.get('code_challenge')).toBe('ch');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
  });
});

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/dashboard/abc?tab=guests')).toBe('/dashboard/abc?tab=guests');
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'dashboard', '', 42, undefined, `/${'a'.repeat(300)}`])(
    'falls back to /dashboard for %s',
    (value) => {
      expect(safeNextPath(value)).toBe('/dashboard');
    },
  );
});

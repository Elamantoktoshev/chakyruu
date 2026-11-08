import { createHash, randomBytes } from 'node:crypto';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import { HttpError } from '../lib/http.js';
import { logger } from '../lib/logger.js';

/** What we keep from a Google account. `sub` is Google's stable account id. */
export interface GoogleProfile {
  sub: string;
  email: string | null;
  name: string | null;
}

/** Google "Sign in" over the OAuth authorization-code flow with PKCE (no Google script on our pages). */
export interface GoogleOAuth {
  authorizationUrl(params: { state: string; codeChallenge: string }): string;
  /** Exchanges the one-time code for a verified profile; throws HttpError(401) when Google says no. */
  exchange(code: string, codeVerifier: string): Promise<GoogleProfile>;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  /** https://<site>/api/auth/google/callback — must be listed in the Google Cloud console. */
  redirectUri: string;
}

const SCOPES = ['openid', 'email', 'profile'];
const RANDOM_BYTES = 32;

const base64url = (buffer: Buffer): string => buffer.toString('base64url');

/** Random state (CSRF) and PKCE pair for one sign-in attempt. */
export function createGoogleAttempt(): { state: string; codeVerifier: string; codeChallenge: string } {
  const codeVerifier = base64url(randomBytes(RANDOM_BYTES));
  return {
    state: base64url(randomBytes(RANDOM_BYTES)),
    codeVerifier,
    codeChallenge: base64url(createHash('sha256').update(codeVerifier).digest()),
  };
}

export function createGoogleOAuth({ clientId, clientSecret, redirectUri }: GoogleOAuthConfig): GoogleOAuth {
  const client = new OAuth2Client({ clientId, clientSecret, redirectUri });

  return {
    authorizationUrl: ({ state, codeChallenge }) =>
      client.generateAuthUrl({
        scope: SCOPES,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: CodeChallengeMethod.S256,
        prompt: 'select_account',
      }),

    async exchange(code, codeVerifier) {
      try {
        const { tokens } = await client.getToken({ code, codeVerifier });
        if (!tokens.id_token) throw new Error('Google returned no id_token');
        const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
        const payload = ticket.getPayload();
        if (!payload?.sub) throw new Error('Google id_token has no subject');
        return {
          sub: payload.sub,
          email: payload.email && payload.email_verified ? payload.email.toLowerCase() : null,
          name: payload.name?.trim() || null,
        };
      } catch (error: unknown) {
        // The reason stays in our logs; the browser only learns that sign-in failed.
        logger.warn({ err: error }, '[auth] Google sign-in failed');
        throw new HttpError(401, 'Google sign-in failed');
      }
    },
  };
}

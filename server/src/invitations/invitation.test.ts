import { describe, expect, it } from 'vitest';
import { publicInvitationQuerySchema, slugParamsSchema } from './invitation.schemas.js';

describe('slugParamsSchema', () => {
  it('accepts kebab-case latin slugs and lowercases them', () => {
    expect(slugParamsSchema.parse({ slug: 'Aibek-Aizada' }).slug).toBe('aibek-aizada');
  });

  it('rejects slugs with spaces, cyrillic or leading dashes', () => {
    for (const slug of ['aibek aizada', 'айбек', '-aibek', 'ab']) {
      expect(slugParamsSchema.safeParse({ slug }).success).toBe(false);
    }
  });
});

describe('publicInvitationQuerySchema', () => {
  it('keeps a well-formed guest token', () => {
    expect(publicInvitationQuerySchema.parse({ g: 'abcdefghijklmnopqrstuv' }).g).toBe('abcdefghijklmnopqrstuv');
  });

  it('drops malformed tokens instead of failing the page', () => {
    for (const g of ['short', '../../etc/passwd', 'a'.repeat(100), '']) {
      expect(publicInvitationQuerySchema.parse({ g }).g, g).toBeUndefined();
    }
    expect(publicInvitationQuerySchema.parse({}).g).toBeUndefined();
  });
});

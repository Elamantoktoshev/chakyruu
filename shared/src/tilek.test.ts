import { describe, expect, it } from 'vitest';
import { createTilekSchema, likeTilekSchema } from './index.js';

describe('createTilekSchema', () => {
  it('accepts a wish with a typed name or with a personal-link token', () => {
    expect(createTilekSchema.parse({ authorName: ' Асель ', text: ' Бактылуу болгула! ' })).toEqual({
      authorName: 'Асель',
      text: 'Бактылуу болгула!',
    });
    expect(createTilekSchema.safeParse({ token: 'abcdefghijklmnopqrstuv', text: 'Ак жол!' }).success).toBe(true);
  });

  it('rejects anonymous, empty, too long or extra-field wishes', () => {
    expect(createTilekSchema.safeParse({ text: 'Ак жол!' }).success).toBe(false);
    expect(createTilekSchema.safeParse({ authorName: 'Асель', text: ' ' }).success).toBe(false);
    expect(createTilekSchema.safeParse({ authorName: 'Асель', text: 'a'.repeat(501) }).success).toBe(false);
    expect(createTilekSchema.safeParse({ authorName: 'Асель', text: 'Ак жол!', hidden: false }).success).toBe(false);
  });
});

describe('likeTilekSchema', () => {
  it('requires a UUID client id', () => {
    expect(likeTilekSchema.safeParse({ clientId: '8f14e45f-ceea-4e7a-9d3b-1c2a3b4c5d6e' }).success).toBe(true);
    expect(likeTilekSchema.safeParse({ clientId: 'me' }).success).toBe(false);
  });
});

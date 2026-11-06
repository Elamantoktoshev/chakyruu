// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { getClientId } from './clientId';

beforeEach(() => localStorage.clear());

describe('getClientId', () => {
  it('creates a UUID once and keeps returning it', () => {
    const first = getClientId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(getClientId()).toBe(first);
  });

  it('replaces a tampered value', () => {
    localStorage.setItem('chakyruu.clientId', 'not-a-uuid');
    expect(getClientId()).not.toBe('not-a-uuid');
  });
});

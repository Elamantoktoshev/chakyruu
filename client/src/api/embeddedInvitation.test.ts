// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { EMBEDDED_INVITATION_ID, takeEmbeddedInvitation } from './embeddedInvitation';

function embed(content: string) {
  const script = document.createElement('script');
  script.type = 'application/json';
  script.id = EMBEDDED_INVITATION_ID;
  script.textContent = content;
  document.body.append(script);
}

afterEach(() => document.getElementById(EMBEDDED_INVITATION_ID)?.remove());

describe('takeEmbeddedInvitation', () => {
  it('returns the embedded invitation once, for the matching slug only', () => {
    embed(JSON.stringify({ slug: 'aibek-aizada', data: { slug: 'aibek-aizada', hostNames: 'Айбек & Айзада' } }));
    expect(takeEmbeddedInvitation('aibek-aizada')?.hostNames).toBe('Айбек & Айзада');
    expect(takeEmbeddedInvitation('aibek-aizada')).toBeNull();
  });

  it('ignores data for another slug and broken JSON', () => {
    embed(JSON.stringify({ slug: 'other', data: {} }));
    expect(takeEmbeddedInvitation('aibek-aizada')).toBeNull();
    embed('{not json');
    expect(takeEmbeddedInvitation('aibek-aizada')).toBeNull();
  });
});

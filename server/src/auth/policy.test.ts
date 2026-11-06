import { describe, expect, it } from 'vitest';
import { canManageInvitation, type InvitationAccessTarget, type PolicyUser } from './policy.js';

const invitation: InvitationAccessTarget = { ownerId: 'u-owner', organizationId: 'org-1' };

function user(overrides: Partial<PolicyUser>): PolicyUser {
  return { id: 'u-other', role: 'OWNER', organizationId: null, ...overrides };
}

describe('canManageInvitation', () => {
  it('allows the invitation owner', () => {
    expect(canManageInvitation(user({ id: 'u-owner' }), invitation)).toBe(true);
  });

  it('denies an unrelated owner', () => {
    expect(canManageInvitation(user({}), invitation)).toBe(false);
  });

  it('allows an org admin of the same organization', () => {
    expect(canManageInvitation(user({ role: 'ORG_ADMIN', organizationId: 'org-1' }), invitation)).toBe(true);
  });

  it('denies an org admin of another organization', () => {
    expect(canManageInvitation(user({ role: 'ORG_ADMIN', organizationId: 'org-2' }), invitation)).toBe(false);
  });

  it('denies an org admin when the invitation has no organization', () => {
    const personal = { ownerId: 'u-owner', organizationId: null };
    expect(canManageInvitation(user({ role: 'ORG_ADMIN', organizationId: null }), personal)).toBe(false);
  });

  it('denies a regular member of the same organization', () => {
    expect(canManageInvitation(user({ role: 'OWNER', organizationId: 'org-1' }), invitation)).toBe(false);
  });

  it('allows a platform admin', () => {
    expect(canManageInvitation(user({ role: 'ADMIN' }), invitation)).toBe(true);
  });
});

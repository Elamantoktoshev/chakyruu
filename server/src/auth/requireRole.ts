import type { RequestHandler, Response } from 'express';
import { HttpError } from '../lib/http.js';
import { currentUser } from './auth.middleware.js';

/** Partner cabinet: an ORG_ADMIN attached to an organization. Use after requireAuth. */
export const requireOrgAdmin: RequestHandler = (_req, res, next) => {
  const user = currentUser(res);
  const isPartner = user.role === 'ORG_ADMIN' && user.organizationId !== null;
  next(isPartner ? undefined : new HttpError(403, 'Partner account required'));
};

/** Super-admin area. Use after requireAuth. */
export const requireAdmin: RequestHandler = (_req, res, next) => {
  next(currentUser(res).role === 'ADMIN' ? undefined : new HttpError(403, 'Admin account required'));
};

/**
 * The partner's own organization id — always taken from the session, never from the URL,
 * so an ORG_ADMIN cannot address another organization at all.
 */
export function currentOrgId(res: Response): string {
  const { organizationId } = currentUser(res);
  if (!organizationId) throw new HttpError(403, 'Partner account required');
  return organizationId;
}

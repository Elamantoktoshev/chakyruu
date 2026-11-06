import type { ApiEnvelope, Invitation, Rsvp, RsvpInput, RsvpList } from './types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(0, 'Network error');
  }

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body?.success || body.data === null) {
    throw new ApiError(response.status, body?.error?.message ?? `HTTP ${response.status}`);
  }
  return body.data;
}

const encode = (slug: string): string => encodeURIComponent(slug);

export const api = {
  getInvitation: (slug: string) => request<Invitation>(`/invitations/${encode(slug)}`),
  createRsvp: (slug: string, input: RsvpInput) =>
    request<Rsvp>(`/invitations/${encode(slug)}/rsvp`, { method: 'POST', body: JSON.stringify(input) }),
  listRsvps: (slug: string) => request<RsvpList>(`/invitations/${encode(slug)}/rsvps`),
};

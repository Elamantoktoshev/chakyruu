import type {
  CreateTilekInput,
  EventType,
  GuestStatus,
  InvitationDraftInput,
  PartnerLeadInput,
  PaymentProviderId,
  RsvpInput,
} from '@chakyruu/shared';
import type {
  AddGuestsResult,
  ApiEnvelope,
  DashboardInvitation,
  Guest,
  Invitation,
  OtpRequestResult,
  OwnerInvitation,
  PublishResult,
  OwnerTilek,
  RsvpResult,
  SessionUser,
  Template,
  Tilek,
} from './types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isMultipart = init?.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      // Session lives in an httpOnly cookie; the API is served from the same origin.
      credentials: 'same-origin',
      // For FormData the browser sets multipart Content-Type with the boundary itself.
      headers: isMultipart ? init?.headers : { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(0, 'Network error');
  }

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body?.success || body.data === null) {
    throw new ApiError(response.status, body?.error?.message ?? `HTTP ${response.status}`, body?.error?.details);
  }
  return body.data;
}

const encode = (value: string): string => encodeURIComponent(value);
const json = (method: string, payload: unknown): RequestInit => ({ method, body: JSON.stringify(payload) });

export const api = {
  getInvitation: (slug: string, guestToken?: string | null) =>
    request<Invitation>(`/public/invitations/${encode(slug)}${guestToken ? `?g=${encode(guestToken)}` : ''}`),
  answerRsvp: (slug: string, input: RsvpInput) =>
    request<RsvpResult>(`/public/invitations/${encode(slug)}/rsvp`, json('POST', input)),
  listTilekter: (slug: string, clientId: string) =>
    request<Tilek[]>(`/public/invitations/${encode(slug)}/tilekter?clientId=${encode(clientId)}`),
  createTilek: (slug: string, input: CreateTilekInput) =>
    request<Tilek>(`/public/invitations/${encode(slug)}/tilekter`, json('POST', input)),
  likeTilek: (tilekId: string, clientId: string) =>
    request<{ likesCount: number; liked: boolean }>(`/public/tilekter/${encode(tilekId)}/like`, json('POST', { clientId })),
  sendPartnerLead: (input: PartnerLeadInput) =>
    request<{ received: true }>('/public/partner-leads', json('POST', input)),
  listTemplates: (type?: EventType) => request<Template[]>(`/public/templates${type ? `?type=${type}` : ''}`),

  requestOtp: (phone: string) => request<OtpRequestResult>('/auth/request-code', json('POST', { phone })),
  verifyOtp: (phone: string, code: string) => request<SessionUser>('/auth/verify', json('POST', { phone, code })),
  me: () => request<SessionUser>('/auth/me'),
  logout: () => request<{ loggedOut: true }>('/auth/logout', { method: 'POST' }),

  listMyInvitations: () => request<DashboardInvitation[]>('/my/invitations'),
  createInvitation: (templateId: string) => request<OwnerInvitation>('/my/invitations', json('POST', { templateId })),
  getMyInvitation: (id: string) => request<OwnerInvitation>(`/my/invitations/${encode(id)}`),
  updateInvitation: (id: string, patch: InvitationDraftInput) =>
    request<OwnerInvitation>(`/my/invitations/${encode(id)}`, json('PATCH', patch)),
  uploadPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return request<{ photoUrl: string }>(`/my/invitations/${encode(id)}/photo`, { method: 'POST', body: form });
  },
  publishInvitation: (id: string, provider: PaymentProviderId) =>
    request<PublishResult>(`/my/invitations/${encode(id)}/publish`, json('POST', { provider })),

  listGuests: (id: string, status?: GuestStatus) =>
    request<Guest[]>(`/my/invitations/${encode(id)}/guests${status ? `?status=${status}` : ''}`),
  addGuests: (id: string, text: string) =>
    request<AddGuestsResult>(`/my/invitations/${encode(id)}/guests/bulk`, json('POST', { text })),
  listMyTilekter: (id: string) => request<OwnerTilek[]>(`/my/invitations/${encode(id)}/tilekter`),
  setTilekHidden: (id: string, tilekId: string, hidden: boolean) =>
    request<OwnerTilek>(`/my/invitations/${encode(id)}/tilekter/${encode(tilekId)}`, json('PATCH', { hidden })),
  deleteGuest: (id: string, guestId: string) =>
    request<{ deleted: true }>(`/my/invitations/${encode(id)}/guests/${encode(guestId)}`, { method: 'DELETE' }),
};

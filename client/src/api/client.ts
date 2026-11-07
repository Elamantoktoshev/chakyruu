import type {
  CatalogQuery,
  CreateGiftInput,
  CreateTilekInput,
  EventType,
  GuestStatus,
  InvitationDraftInput,
  OrgProfileInput,
  PartnerLeadInput,
  PaymentProviderId,
  RsvpInput,
  TamadaProfileInput,
} from '@chakyruu/shared';
import type {
  AddGuestsResult,
  AdminLead,
  AdminOrganization,
  AdminPayment,
  AdminPrice,
  CheckoutOutcome,
  PaymentStatusView,
  ApiEnvelope,
  LeadStatus,
  OrgType,
  PublicPrice,
  CreditLedgerEntry,
  Hall,
  MyGift,
  PartnerGift,
  PartnerProfile,
  PartnerStats,
  TamadaCard,
  VenueOption,
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
  createInvitation: (templateId: string, giftCode?: string) =>
    request<OwnerInvitation>('/my/invitations', json('POST', giftCode ? { templateId, giftCode } : { templateId })),
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

  listMyGifts: () => request<MyGift[]>('/my/gifts'),

  listTamadas: (query: Partial<Record<keyof CatalogQuery, string>>) => {
    const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value) as [string, string][]);
    return request<TamadaCard[]>(`/public/tamadas${params.size ? `?${params}` : ''}`);
  },
  listVenues: (city?: string) => request<VenueOption[]>(`/public/venues${city ? `?city=${encode(city)}` : ''}`),

  partner: {
    profile: () => request<PartnerProfile>('/partner/profile'),
    updateProfile: (patch: OrgProfileInput) => request<PartnerProfile>('/partner/profile', json('PATCH', patch)),
    uploadLogo: (file: File) => {
      const form = new FormData();
      form.append('logo', file);
      return request<{ logoUrl: string }>('/partner/logo', { method: 'POST', body: form });
    },
    addHall: (hall: Omit<Hall, 'id'>) => request<Hall>('/partner/halls', json('POST', hall)),
    deleteHall: (hallId: string) => request<{ deleted: true }>(`/partner/halls/${encode(hallId)}`, { method: 'DELETE' }),
    updateTamada: (patch: TamadaProfileInput) => request<PartnerProfile>('/partner/tamada', json('PATCH', patch)),
    uploadTamadaPhoto: (file: File) => {
      const form = new FormData();
      form.append('photo', file);
      return request<{ photoUrl: string }>('/partner/tamada/photo', { method: 'POST', body: form });
    },
    setBusy: (date: string, isBusy: boolean) =>
      request<{ busy: boolean }>(`/partner/busy-dates/${encode(date)}`, { method: isBusy ? 'PUT' : 'DELETE' }),
    credits: () => request<{ balance: number; ledger: CreditLedgerEntry[] }>('/partner/credits'),
    stats: () => request<PartnerStats>('/partner/stats'),
    gifts: () => request<PartnerGift[]>('/partner/gifts'),
    issueGift: (input: CreateGiftInput) => request<PartnerGift>('/partner/gifts', json('POST', input)),
    cancelGift: (giftId: string) =>
      request<{ cancelled: true }>(`/partner/gifts/${encode(giftId)}/cancel`, { method: 'POST' }),
    purchaseCredits: (priceCode: string, provider: PaymentProviderId) =>
      request<CheckoutOutcome>('/partner/credits/purchase', json('POST', { priceCode, provider })),
  },

  listPrices: () => request<PublicPrice[]>('/public/prices'),
  paymentStatus: (paymentId: string) => request<PaymentStatusView>(`/my/payments/${encode(paymentId)}`),

  admin: {
    organizations: (type?: OrgType) => request<AdminOrganization[]>(`/admin/organizations${type ? `?type=${type}` : ''}`),
    setCatalogStatus: (id: string, catalogStatus: 'HIDDEN' | 'PUBLISHED') =>
      request<{ id: string; catalogStatus: string }>(`/admin/organizations/${encode(id)}`, json('PATCH', { catalogStatus })),
    grantCredits: (id: string, amount: number) =>
      request<{ balance: number }>(`/admin/organizations/${encode(id)}/credits`, json('POST', { amount })),
    leads: (status?: LeadStatus) => request<AdminLead[]>(`/admin/leads${status ? `?status=${status}` : ''}`),
    setLeadStatus: (id: string, status: 'NEW' | 'CONTACTED') =>
      request<AdminLead>(`/admin/leads/${encode(id)}`, json('PATCH', { status })),
    convertLead: (id: string) =>
      request<{ id: string; name: string; type: OrgType }>(`/admin/leads/${encode(id)}/convert`, json('POST', {})),
    prices: () => request<AdminPrice[]>('/admin/prices'),
    updatePrice: (code: string, patch: { amountSom?: number; active?: boolean }) =>
      request<AdminPrice>(`/admin/prices/${encode(code)}`, json('PATCH', patch)),
    payments: (status?: 'PENDING' | 'SUCCEEDED' | 'FAILED') =>
      request<AdminPayment[]>(`/admin/payments${status ? `?status=${status}` : ''}`),
    confirmPayment: (id: string) => request<{ confirmed: true }>(`/admin/payments/${encode(id)}/confirm`, { method: 'POST' }),
  },
};

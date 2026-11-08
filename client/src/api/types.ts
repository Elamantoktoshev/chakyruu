import type { EventType, GuestStatus, GuestSummary, Language, OpeningAnimation, TrackCategory } from '@chakyruu/shared';

export type { EventType, GuestStatus, Language } from '@chakyruu/shared';
export type TemplateType = EventType;
export type InvitationStatus = 'DRAFT' | 'PAID' | 'PUBLISHED';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: { message: string; details?: unknown } | null;
}

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  /** Component in client/src/templates (TEMPLATE_KEYS). */
  componentKey: string;
  /** Shown under every toi type filter. */
  isUniversal: boolean;
  config: unknown;
  /** Final publish price in som (the design's own price, or the shop-wide one); null = not on sale. */
  priceSom: number | null;
  badge: TemplateBadge | null;
  /** Catalog card text per language. */
  description: Partial<Record<'ky' | 'ru', string>>;
}

export type TemplateBadge = 'HIT' | 'NEW';

/** Fields the invitation page renders — shared by the public page, the builder preview and template cards. */
export interface InvitationContent {
  slug: string;
  hostNames: string;
  eventType: EventType;
  eventDate: string | null;
  venueName: string;
  venueAddress: string | null;
  venueMapUrl: string | null;
  photoUrl: string | null;
  musicTrackId: string | null;
  musicStartSec: number;
  /** Resolved by the server: the catalogue track or the owner's own mp3; null = no music. */
  music: MusicView | null;
  /** Up to GALLERY_MAX_PHOTOS webp photos, in display order. */
  gallery: GalleryPhoto[];
  message: string | null;
  language: Language;
  adultsOnly: boolean;
  /** One of the template's palettes; null = its first. */
  paletteId: string | null;
  /** Age on the "Юбилей" template. */
  heroNumber: number | null;
  openingAnimation: OpeningAnimation;
  /** Toi programme, raw JSON from the server (read with readProgram). */
  program: unknown;
  /** Partner gifts may hide "made with Chakyruu.kg". */
  hideBranding: boolean;
  /** Unpublished (owner preview): no public calendar file yet. */
  isDraft?: boolean;
  template: Template;
  /** Partner branding blocks (public page and builder preview). */
  venue?: VenueBlock | null;
  tamada?: TamadaBlock | null;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  width: number;
  height: number;
}

export interface MusicView {
  src: string;
  /** Catalogue title; null for the owner's own file. */
  title: string | null;
  durationSec: number | null;
  startSec: number;
  isCustom: boolean;
}

export interface Track {
  id: string;
  title: string;
  category: TrackCategory;
  file: string;
  durationSec: number | null;
}

export interface AdminTrack extends Omit<Track, 'file'> {
  file: string | null;
  active: boolean;
  sortOrder: number;
  /** File uploaded through the admin (otherwise it ships in client/public/music). */
  isUploaded: boolean;
  /** Invitations that use the track. */
  usedBy: number;
  updatedAt: string;
}

/** What the invitation page knows about the guest behind a personal link. */
export interface PublicGuest {
  name: string;
  status: GuestStatus;
  guestsCount: number;
}

export interface Invitation extends InvitationContent {
  id: string;
  /** True when the owner is looking at an unpublished invitation. */
  isDraft: boolean;
  /** Present when opened through a personal link (?g=token). */
  guest: PublicGuest | null;
}

export interface Guest extends PublicGuest {
  id: string;
  phone: string | null;
  token: string;
  source: 'INVITED' | 'SELF';
  respondedAt: string | null;
  createdAt: string;
}

export interface AddGuestsResult {
  created: Guest[];
  skipped: number;
}

export interface RsvpResult {
  guest: PublicGuest;
  /** Issued to a guest who answered on the shared link, to change the answer later. */
  token: string | null;
}

export interface OwnerInvitation extends InvitationContent {
  id: string;
  status: InvitationStatus;
  templateId: string;
  publishedAt: string | null;
  updatedAt: string;
  venueOrgId: string | null;
  tamadaOrgId: string | null;
  hallId: string | null;
  /** Created from a partner's gift: publishing is free. */
  isGift: boolean;
  /** What publishing costs: the template's own price or the shop-wide one; null = not on sale. */
  priceSom: number | null;
  giftFrom: { name: string; type: OrgType } | null;
}

export interface ManualInstructions {
  receiver: string;
  reference: string;
  amountSom: number;
}

/** What the payer must do next, as decided by the payment gateway. */
export type CheckoutView =
  | { kind: 'redirect'; url: string }
  | { kind: 'qr'; qrPayload: string; url?: string }
  | { kind: 'manual'; instructions: ManualInstructions };

export type PublishResult =
  | { status: 'PUBLISHED'; slug: string; paymentId: string | null }
  | { status: 'PENDING'; slug: string; paymentId: string; checkout: CheckoutView };

export interface CheckoutOutcome {
  paymentId: string;
  status: 'SUCCEEDED' | 'PENDING';
  checkout?: CheckoutView;
}

export interface PaymentStatusView {
  id: string;
  purpose: 'INVITATION' | 'CREDIT_PACKAGE';
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  amountSom: number;
  reference: string | null;
  credits: number | null;
  invitationSlug: string | null;
  checkout: CheckoutView | null;
}

export interface AdminPayment {
  id: string;
  purpose: 'INVITATION' | 'CREDIT_PACKAGE';
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  amount: number;
  provider: 'MBANK' | 'ODENGI' | 'ELSOM';
  gateway: string;
  reference: string | null;
  credits: number | null;
  createdAt: string;
  paidAt: string | null;
  invitation: { slug: string; hostNames: string; owner: { phone: string | null; email: string | null } } | null;
  organization: { name: string; phone: string | null } | null;
}

export type UserRole = 'OWNER' | 'ORG_ADMIN' | 'ADMIN';

export interface SessionUser {
  id: string;
  /** Null for people who signed in with Google only. */
  phone: string | null;
  email: string | null;
  name: string | null;
  role: UserRole;
  organizationId: string | null;
}

export interface AuthOptions {
  google: boolean;
}

export interface OtpRequestResult {
  expiresInSeconds: number;
  /** Only when the server runs with DEV_LOGIN_WITHOUT_SMS: log in right away, no SMS step. */
  devCode?: string;
}

export interface Tilek {
  id: string;
  authorName: string;
  text: string;
  likesCount: number;
  createdAt: string;
  likedByMe: boolean;
}

export interface OwnerTilek extends Omit<Tilek, 'likedByMe'> {
  hidden: boolean;
  guestId: string | null;
}

export interface DashboardInvitation {
  id: string;
  slug: string;
  status: InvitationStatus;
  hostNames: string;
  eventType: EventType;
  eventDate: string | null;
  venueName: string;
  photoUrl: string | null;
  updatedAt: string;
  summary: GuestSummary;
}

export type OrgType = 'VENUE' | 'TAMADA' | 'AGENCY';
export type PartnerLanguage = 'KY' | 'RU' | 'UZ';

export interface Hall {
  id: string;
  name: string;
  capacity: number;
}

export interface TamadaProfile {
  displayName: string;
  photoUrl: string | null;
  bio: string | null;
  languages: PartnerLanguage[];
  priceFromSom: number | null;
  videoUrls: string[];
}

export interface PartnerProfile {
  id: string;
  type: OrgType;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  city: string | null;
  logoUrl: string | null;
  address: string | null;
  mapUrl: string | null;
  invitationCredits: number;
  catalogStatus: 'HIDDEN' | 'PUBLISHED';
  halls: Hall[];
  tamadaProfile: TamadaProfile | null;
  busyDates: string[];
}

export type GiftStatus = 'ACTIVE' | 'IN_PROGRESS' | 'USED' | 'CANCELLED' | 'EXPIRED';

export interface PartnerGift {
  id: string;
  code: string;
  clientPhone: string;
  eventDate: string;
  expiresAt: string;
  status: GiftStatus;
  hall: { id: string; name: string } | null;
  createdAt: string;
}

export interface MyGift {
  id: string;
  code: string;
  eventDate: string;
  expiresAt: string;
  hall: { name: string } | null;
  organization: { name: string; type: OrgType; city: string | null; logoUrl: string | null };
}

export interface CreditLedgerEntry {
  id: string;
  amount: number;
  reason: 'PURCHASE' | 'GIFT_ISSUED' | 'GIFT_REFUND' | 'ADMIN_GRANT';
  createdAt: string;
}

export interface PartnerStats {
  gifts: Record<GiftStatus, number> & { issued: number };
  invitations: number;
  peopleComing: number;
  tamadaClicks: { total: number; last30Days: number };
  calendar: { slug: string; hostNames: string; eventDate: string; eventType: EventType; hall: { id: string; name: string } | null }[];
}

export interface TamadaCard extends TamadaProfile {
  id: string;
  city: string | null;
  instagram: string | null;
}

export interface VenueOption {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  logoUrl: string | null;
  halls: Hall[];
}

export interface VenueBlock {
  name: string;
  logoUrl: string | null;
  address: string | null;
  mapUrl: string | null;
  hallName: string | null;
}

export interface TamadaBlock {
  id: string;
  displayName: string;
  photoUrl: string | null;
}

export type PriceAudience = 'CLIENT' | 'VENUE' | 'TAMADA';

export interface PublicPrice {
  code: string;
  audience: PriceAudience;
  amountSom: number;
  credits: number | null;
}

/** One artwork slot of an illustrated design in /admin. */
export interface AdminTemplateAsset {
  file: string;
  label: string;
  /** Uploaded file, else the one shipped in client/public/templates/<slug>/ (may not exist yet). */
  url: string;
  isUploaded: boolean;
}

export interface AdminTemplate {
  id: string;
  name: string;
  type: EventType;
  componentKey: string;
  isUniversal: boolean;
  sortOrder: number;
  /** Own price in som; null = the shop-wide publish price. */
  priceSom: number | null;
  badge: TemplateBadge | null;
  isActive: boolean;
  description: Partial<Record<'ky' | 'ru', string>>;
  /** Empty for code-drawn templates. */
  assets: AdminTemplateAsset[];
}

export interface AdminTemplatePatch {
  name?: string;
  priceSom?: number | null;
  badge?: TemplateBadge | null;
  type?: EventType;
  sortOrder?: number;
  isActive?: boolean;
  description?: Partial<Record<'ky' | 'ru', string>>;
}

export interface AdminPrice extends PublicPrice {
  active: boolean;
  sortOrder: number;
}

export interface AdminOrganization {
  id: string;
  type: OrgType;
  name: string;
  city: string | null;
  phone: string | null;
  invitationCredits: number;
  catalogStatus: 'HIDDEN' | 'PUBLISHED';
  createdAt: string;
  adminPhones: string[];
  giftsIssued: number;
  invitations: number;
}

export type LeadStatus = 'NEW' | 'CONTACTED' | 'CONVERTED';

export interface AdminLead {
  id: string;
  type: OrgType;
  status: LeadStatus;
  name: string;
  phone: string;
  venueName: string;
  city: string | null;
  organizationId: string | null;
  createdAt: string;
}

export interface AdminStats {
  period: 'day' | 'week' | 'month';
  since: string;
  newUsers: number;
  invitationsCreated: number;
  invitationsPublished: number;
  revenueSom: number;
  paidPayments: number;
  conversionPercent: number;
}

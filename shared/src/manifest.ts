/**
 * Illustrated templates: one generic React template drawn from a JSON manifest (stored in
 * Template.config) and image files in client/public/templates/<slug>/ or uploaded to Spaces.
 */

/** Layered openings (new) plus the four code-drawn scenes that need no files. */
export const ILLUSTRATED_OPENINGS = ['hands', 'branches', 'cloche', 'carpet', 'portrait'] as const;
export const BUILT_IN_OPENINGS = ['boz-uy', 'envelope', 'curtains', 'tunduk'] as const;
export const OPENING_KINDS = [...ILLUSTRATED_OPENINGS, ...BUILT_IN_OPENINGS] as const;
export type OpeningKind = (typeof OPENING_KINDS)[number];
export type IllustratedOpening = (typeof ILLUSTRATED_OPENINGS)[number];

/** Tags on the catalog card. */
export const TEMPLATE_FEATURES = ['envelope', 'kyrgyz', 'map', 'rsvp', 'music', 'countdown', 'gallery'] as const;
export type TemplateFeature = (typeof TEMPLATE_FEATURES)[number];

/** Where a layer sits on the 9:16 stage before it moves. */
export const LAYER_ANCHORS = ['fill', 'center', 'left', 'right', 'top', 'bottom'] as const;
export type LayerAnchor = (typeof LAYER_ANCHORS)[number];

/** One keyframe end: x / y in % of the stage, rotate in degrees. */
export interface LayerMotion {
  x?: number;
  y?: number;
  rotate?: number;
  scale?: number;
  opacity?: number;
}

export interface OpeningLayer {
  id: string;
  /** "envelope.webp" or "layers/hand-left.webp". */
  file: string;
  /** Name shown on the placeholder until the artwork exists ("Сол кол"). */
  label: string;
  anchor: LayerAnchor;
  /** Width in % of the stage (height follows the picture). */
  widthPct: number;
  from: LayerMotion;
  to: LayerMotion;
  delayMs: number;
  durationMs: number;
  zIndex: number;
}

export interface ManifestPalette {
  primary: string;
  accent: string;
  background: string;
  ink: string;
  /** Pastel behind the phone on the catalog card. */
  card: string;
  isDark: boolean;
}

/** Validated by manifest.schema.ts on the server; the client receives it ready to use. */
export interface TemplateManifest {
  version: 1;
  slug: string;
  palette: ManifestPalette;
  /** Heading font: serif = Playfair (with Kyrgyz letters), sans = Montserrat. */
  font: 'serif' | 'sans';
  opening: { kind: OpeningKind; layers: readonly (Partial<OpeningLayer> & { id: string })[] };
  features: readonly TemplateFeature[];
  /** Files uploaded in /admin (Spaces URL) — win over the files shipped in the repo. */
  uploads: Readonly<Record<string, string>>;
  /** Tiny blurred previews (data: URLs) generated on upload. */
  placeholders: Readonly<Record<string, string>>;
  /** Storage keys of the uploads, so a replaced file can be deleted (server only). */
  uploadKeys?: Readonly<Record<string, string>>;
}

const layer = (value: Omit<OpeningLayer, 'zIndex'> & { zIndex?: number }): OpeningLayer => ({ zIndex: 1, ...value });

interface OpeningPreset {
  /** Until the invitation shows (the overlay then fades out). */
  durationMs: number;
  layers: readonly OpeningLayer[];
}

/**
 * Default choreography per opening. Artists draw the listed files; a manifest only tweaks timing.
 * Only transform and opacity are animated (smooth on cheap phones).
 */
export const OPENING_PRESETS: Readonly<Record<IllustratedOpening, OpeningPreset>> = {
  // Gloved hands bring an envelope, the wax seal pops, the card slides up.
  hands: {
    durationMs: 3600,
    layers: [
      layer({ id: 'backdrop', file: 'layers/backdrop.webp', label: 'Фон', anchor: 'fill', widthPct: 100, from: { opacity: 1 }, to: { opacity: 1 }, delayMs: 0, durationMs: 100, zIndex: 0 }),
      layer({ id: 'envelope', file: 'envelope.webp', label: 'Конверт', anchor: 'center', widthPct: 78, from: { y: 60, opacity: 0 }, to: { y: 0, opacity: 1 }, delayMs: 200, durationMs: 1100, zIndex: 2 }),
      layer({ id: 'hand-left', file: 'layers/hand-left.webp', label: 'Сол кол', anchor: 'left', widthPct: 55, from: { x: -60, y: 30 }, to: { x: 0, y: 0 }, delayMs: 200, durationMs: 1100, zIndex: 3 }),
      layer({ id: 'hand-right', file: 'layers/hand-right.webp', label: 'Оң кол', anchor: 'right', widthPct: 55, from: { x: 60, y: 30 }, to: { x: 0, y: 0 }, delayMs: 200, durationMs: 1100, zIndex: 3 }),
      layer({ id: 'seal', file: 'seal.webp', label: 'Мөөр', anchor: 'center', widthPct: 20, from: { scale: 1, opacity: 1 }, to: { scale: 1.6, opacity: 0 }, delayMs: 1500, durationMs: 500, zIndex: 4 }),
      layer({ id: 'card', file: 'cover.webp', label: 'Чакыруу', anchor: 'center', widthPct: 62, from: { y: 10, opacity: 0, scale: 0.9 }, to: { y: -18, opacity: 1, scale: 1 }, delayMs: 1900, durationMs: 1000, zIndex: 2 }),
    ],
  },
  // Branches part to the sides and reveal the garden; a butterfly flies up.
  branches: {
    durationMs: 3200,
    layers: [
      layer({ id: 'garden', file: 'cover.webp', label: 'Бак', anchor: 'fill', widthPct: 100, from: { scale: 1.12 }, to: { scale: 1 }, delayMs: 0, durationMs: 3000, zIndex: 0 }),
      layer({ id: 'branch-left', file: 'layers/branch-left.webp', label: 'Сол бутак', anchor: 'left', widthPct: 75, from: { x: 0 }, to: { x: -80, rotate: -6 }, delayMs: 500, durationMs: 1800, zIndex: 3 }),
      layer({ id: 'branch-right', file: 'layers/branch-right.webp', label: 'Оң бутак', anchor: 'right', widthPct: 75, from: { x: 0 }, to: { x: 80, rotate: 6 }, delayMs: 500, durationMs: 1800, zIndex: 3 }),
      layer({ id: 'butterfly', file: 'layers/butterfly.webp', label: 'Көпөлөк', anchor: 'bottom', widthPct: 16, from: { y: 0, x: -10, opacity: 0 }, to: { y: -70, x: 15, opacity: 1, rotate: 12 }, delayMs: 900, durationMs: 2200, zIndex: 4 }),
    ],
  },
  // A silver cloche lifts off a tray and uncovers the invitation ticket.
  cloche: {
    durationMs: 3000,
    layers: [
      layer({ id: 'backdrop', file: 'layers/backdrop.webp', label: 'Фон', anchor: 'fill', widthPct: 100, from: { opacity: 1 }, to: { opacity: 1 }, delayMs: 0, durationMs: 100, zIndex: 0 }),
      layer({ id: 'tray', file: 'layers/tray.webp', label: 'Табак', anchor: 'bottom', widthPct: 90, from: { y: 10, opacity: 0 }, to: { y: 0, opacity: 1 }, delayMs: 0, durationMs: 700, zIndex: 1 }),
      layer({ id: 'ticket', file: 'cover.webp', label: 'Чакыруу', anchor: 'center', widthPct: 58, from: { scale: 0.85, opacity: 0 }, to: { scale: 1, opacity: 1 }, delayMs: 1300, durationMs: 900, zIndex: 2 }),
      layer({ id: 'cloche', file: 'layers/cloche.webp', label: 'Капкак', anchor: 'center', widthPct: 80, from: { y: 0 }, to: { y: -130, rotate: -10 }, delayMs: 900, durationMs: 1300, zIndex: 3 }),
    ],
  },
  // A rolled carpet (килем / шырдак) unrolls downwards over the screen.
  carpet: {
    durationMs: 3000,
    layers: [
      layer({ id: 'carpet', file: 'layers/carpet.webp', label: 'Килем', anchor: 'top', widthPct: 100, from: { y: -100 }, to: { y: 0 }, delayMs: 200, durationMs: 1800, zIndex: 1 }),
      layer({ id: 'roll', file: 'layers/roll.webp', label: 'Түрмөк', anchor: 'top', widthPct: 104, from: { y: -12 }, to: { y: 100, opacity: 0 }, delayMs: 200, durationMs: 1800, zIndex: 2 }),
      layer({ id: 'medallion', file: 'layers/medallion.webp', label: 'Ою', anchor: 'center', widthPct: 45, from: { scale: 0.4, opacity: 0, rotate: -40 }, to: { scale: 1, opacity: 1, rotate: 0 }, delayMs: 1800, durationMs: 900, zIndex: 3 }),
    ],
  },
  // A portrait fades in, then an ornamental frame grows around it.
  portrait: {
    durationMs: 3200,
    layers: [
      layer({ id: 'portrait', file: 'cover.webp', label: 'Портрет', anchor: 'fill', widthPct: 100, from: { opacity: 0, scale: 1.08 }, to: { opacity: 1, scale: 1 }, delayMs: 0, durationMs: 1800, zIndex: 0 }),
      layer({ id: 'frame', file: 'layers/frame.webp', label: 'Ою рамка', anchor: 'fill', widthPct: 100, from: { opacity: 0, scale: 1.15 }, to: { opacity: 1, scale: 1 }, delayMs: 1200, durationMs: 1400, zIndex: 2 }),
      layer({ id: 'sparkles', file: 'layers/sparkles.webp', label: 'Жылтыр', anchor: 'fill', widthPct: 100, from: { opacity: 0, y: 4 }, to: { opacity: 1, y: 0 }, delayMs: 2000, durationMs: 1000, zIndex: 3 }),
    ],
  },
};

function isIllustrated(kind: OpeningKind): kind is IllustratedOpening {
  return (ILLUSTRATED_OPENINGS as readonly string[]).includes(kind);
}

/** The layers to animate: the preset, with the manifest's per-id overrides applied. */
export function openingLayers(manifest: TemplateManifest): readonly OpeningLayer[] {
  const { kind, layers: overrides } = manifest.opening;
  if (!isIllustrated(kind)) return [];
  return OPENING_PRESETS[kind].layers.map((preset) => {
    const override = overrides.find((candidate) => candidate.id === preset.id);
    return override ? { ...preset, ...override } : preset;
  });
}

export function openingDurationMs(manifest: TemplateManifest): number {
  const { kind } = manifest.opening;
  return isIllustrated(kind) ? OPENING_PRESETS[kind].durationMs : 0;
}

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

/**
 * Light structural check for code that receives Template.config already validated by the server
 * (client, OG renderer): no zod here, so it stays out of the browser bundle.
 */
export function manifestOf(config: unknown): TemplateManifest | null {
  if (typeof config !== 'object' || config === null) return null;
  const candidate = config as Partial<TemplateManifest>;
  const palette = candidate.palette;
  const isPaletteOk =
    palette !== undefined && [palette.primary, palette.accent, palette.background, palette.ink, palette.card].every((value) => typeof value === 'string' && HEX_COLOUR.test(value));
  const isOpeningOk = typeof candidate.opening?.kind === 'string' && (OPENING_KINDS as readonly string[]).includes(candidate.opening.kind);
  if (candidate.version !== 1 || typeof candidate.slug !== 'string' || !isPaletteOk || !isOpeningOk) return null;
  return {
    ...(candidate as TemplateManifest),
    opening: { kind: candidate.opening!.kind, layers: candidate.opening!.layers ?? [] },
    features: candidate.features ?? [],
    uploads: candidate.uploads ?? {},
    placeholders: candidate.placeholders ?? {},
  };
}

/** Shipped files live in client/public/templates/<slug>/ (served at /templates/<slug>/). */
export const TEMPLATE_ASSETS_BASE = '/templates';

export function assetUrl(manifest: TemplateManifest, file: string): string {
  return manifest.uploads[file] ?? `${TEMPLATE_ASSETS_BASE}/${manifest.slug}/${file}`;
}

export interface AssetSlot {
  file: string;
  label: string;
  /** Animation layers that do not fill the stage must be cut out (PNG/WebP with transparency). */
  needsTransparency: boolean;
  /** The cover is shown in the 9:16 phone: its proportions are checked. */
  isCover: boolean;
}

/** Every file the design uses, with what the artist must deliver (admin upload slots, README table). */
export function assetSlots(manifest: TemplateManifest): readonly AssetSlot[] {
  const fixed: readonly AssetSlot[] = [
    { file: 'cover.webp', label: 'Обложка', needsTransparency: false, isCover: true },
    { file: 'bg.webp', label: 'Баракчанын фону', needsTransparency: false, isCover: false },
  ];
  const layers = openingLayers(manifest)
    .filter((item) => !fixed.some((slot) => slot.file === item.file))
    .map((item) => ({ file: item.file, label: item.label, needsTransparency: item.anchor !== 'fill', isCover: false }));
  return [...fixed, ...layers.filter((slot, index) => layers.findIndex((other) => other.file === slot.file) === index)];
}

export function requiredAssetFiles(manifest: TemplateManifest): readonly string[] {
  return assetSlots(manifest).map((slot) => slot.file);
}

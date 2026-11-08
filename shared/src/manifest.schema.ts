import { z } from 'zod';
import { LAYER_ANCHORS, OPENING_KINDS, TEMPLATE_FEATURES, type TemplateManifest } from './manifest.js';

/** Server-side validation of template manifests (admin edits, seed). Kept out of the client bundle. */
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a #RRGGBB colour');
/** "cover.webp", "layers/hand-left.webp": lowercase, no "..", always .webp. */
const assetFile = z.string().regex(/^(layers\/)?[a-z0-9][a-z0-9-]{0,40}\.webp$/, 'must look like layers/name.webp');
/** Spaces/CDN (https://…) in production, /uploads/<key> with local storage. Never javascript: or http:. */
const assetLocation = z.union([
  z.url({ protocol: /^https$/ }),
  z.string().regex(/^\/[A-Za-z0-9/_.-]{1,200}$/).refine((value) => !value.includes('..') && !value.startsWith('//'), 'must be a site path'),
]);
/** Tiny blurred preview as a data: URL, generated when an image is uploaded. */
const blurDataUrl = z.string().regex(/^data:image\/webp;base64,[A-Za-z0-9+/=]{1,4000}$/);

/** One keyframe end: x / y in % of the stage, rotate in degrees. */
const motionSchema = z
  .object({
    x: z.number().min(-200).max(200),
    y: z.number().min(-200).max(200),
    rotate: z.number().min(-360).max(360),
    scale: z.number().min(0).max(4),
    opacity: z.number().min(0).max(1),
  })
  .partial();

const layerSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,30}$/),
  file: assetFile,
  /** Russian/Kyrgyz name shown on the placeholder until the artwork exists ("Сол кол"). */
  label: z.string().max(40),
  anchor: z.enum(LAYER_ANCHORS),
  /** Width in % of the stage (height follows the picture). */
  widthPct: z.number().min(5).max(200),
  from: motionSchema,
  to: motionSchema,
  delayMs: z.number().int().min(0).max(10_000),
  durationMs: z.number().int().min(100).max(10_000),
  zIndex: z.number().int().min(0).max(20),
});

export const templateManifestSchema = z.object({
  version: z.literal(1),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,39}$/),
  palette: z.object({
    primary: hex,
    accent: hex,
    background: hex,
    ink: hex,
    /** Pastel behind the phone on the catalog card. */
    card: hex,
    isDark: z.boolean(),
  }),
  /** Heading font: serif = Playfair (with Kyrgyz letters), sans = Montserrat. */
  font: z.enum(['serif', 'sans']),
  opening: z.object({
    kind: z.enum(OPENING_KINDS),
    /** Overrides of preset layers by id (only the changed fields). */
    layers: z.array(layerSchema.partial().required({ id: true })).max(12).default([]),
  }),
  features: z.array(z.enum(TEMPLATE_FEATURES)).max(TEMPLATE_FEATURES.length).default([]),
  /** Files uploaded in /admin (Spaces URL) — win over the files shipped in the repo. */
  uploads: z.record(assetFile, assetLocation).default({}),
  placeholders: z.record(assetFile, blurDataUrl).default({}),
  /** Storage keys of the uploads, so a replaced file can be deleted. */
  uploadKeys: z.record(assetFile, z.string().regex(/^[a-f0-9-]{36}\.webp$/)).default({}),
});

export function parseManifest(input: unknown): TemplateManifest {
  return templateManifestSchema.parse(input) satisfies TemplateManifest;
}

export function safeParseManifest(input: unknown): TemplateManifest | null {
  const result = templateManifestSchema.safeParse(input);
  return result.success ? (result.data satisfies TemplateManifest) : null;
}

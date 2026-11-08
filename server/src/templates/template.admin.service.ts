import {
  ILLUSTRATED_TEMPLATE_KEY,
  assetSlots,
  assetUrl,
  parseManifest,
  type AssetSlot,
  type TemplateManifest,
  type adminTemplatePatchSchema,
} from '@chakyruu/shared';
import { Prisma } from '@prisma/client';
import sharp from 'sharp';
import type { z } from 'zod';
import { HttpError } from '../lib/http.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { removeQuietly } from '../storage/audioUpload.js';
import { detectImageType } from '../storage/image.js';
import { toWebp } from '../storage/imageProcess.js';
import type { StorageProvider } from '../storage/storage.provider.js';

/** Cover and page background: full-screen on big phones. */
const FULL_SCREEN_MAX_SIZE = 1920;
/** Animation layers are never wider than the screen. */
const LAYER_MAX_SIZE = 1600;
/** The cover must be 9:16 (1080×1920); a little cropping is tolerated. */
const COVER_RATIO = 16 / 9;
const COVER_RATIO_TOLERANCE = 0.04;
/** Width of the blurred preview kept inline in the manifest. */
const BLUR_WIDTH = 16;
const BLUR_QUALITY = 40;

type TemplatePatch = z.infer<typeof adminTemplatePatchSchema>;

const adminTemplateSelect = {
  id: true,
  name: true,
  type: true,
  componentKey: true,
  isUniversal: true,
  sortOrder: true,
  priceSom: true,
  badge: true,
  isActive: true,
  description: true,
  config: true,
} as const;

async function findTemplate(id: string) {
  const template = await prisma.template.findUnique({ where: { id }, select: adminTemplateSelect });
  if (!template) throw new HttpError(404, 'Template not found');
  return template;
}

/** The manifest of an illustrated template, or 400 for the code-drawn ones. */
function manifestFor(template: { componentKey: string; config: unknown }): TemplateManifest {
  if (template.componentKey !== ILLUSTRATED_TEMPLATE_KEY) throw new HttpError(400, 'Only illustrated templates have artwork files');
  try {
    return parseManifest(template.config);
  } catch (error: unknown) {
    logger.error({ err: error }, '[templates] stored manifest is invalid');
    throw new HttpError(409, 'The template manifest is invalid; fix it in the seed first');
  }
}

/** Every template (switched-off ones too); illustrated ones list their artwork slots. */
export async function listTemplatesForAdmin() {
  const templates = await prisma.template.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], select: adminTemplateSelect });
  return templates.map(({ config, ...template }) => {
    if (template.componentKey !== ILLUSTRATED_TEMPLATE_KEY) return { ...template, assets: [] };
    const manifest = manifestFor({ componentKey: template.componentKey, config });
    const assets = assetSlots(manifest).map((slot) => ({
      file: slot.file,
      label: slot.label,
      url: assetUrl(manifest, slot.file),
      isUploaded: slot.file in manifest.uploads,
    }));
    return { ...template, assets };
  });
}

export async function updateTemplate(id: string, patch: TemplatePatch) {
  const current = await findTemplate(id);
  const { description, ...rest } = patch;
  // Per language: sending only { ky } keeps the Russian text.
  const merged = description ? { ...(current.description as Record<string, string>), ...description } : undefined;
  return prisma.template.update({
    where: { id },
    data: { ...rest, ...(merged ? { description: merged as Prisma.InputJsonValue } : {}) },
    select: adminTemplateSelect,
  });
}

function slotOf(manifest: TemplateManifest, file: string): AssetSlot {
  const slot = assetSlots(manifest).find((candidate) => candidate.file === file);
  if (!slot) throw new HttpError(400, `"${file}" is not an artwork file of this design`);
  return slot;
}

/** Proportions and transparency the opening needs; checked before anything is stored. */
async function checkArtwork(data: Buffer, slot: AssetSlot): Promise<void> {
  if (!detectImageType(data)) throw new HttpError(400, 'Only JPEG, PNG or WebP images are allowed');
  const meta = await sharp(data).metadata().catch(() => null);
  if (!meta?.width || !meta.height) throw new HttpError(400, 'Could not read this image');
  // EXIF orientations 5–8 swap width and height.
  const [width, height] = (meta.orientation ?? 1) >= 5 ? [meta.height, meta.width] : [meta.width, meta.height];
  if (slot.isCover && Math.abs(height / width - COVER_RATIO) > COVER_RATIO * COVER_RATIO_TOLERANCE) {
    throw new HttpError(400, `The cover must be 9:16 (for example 1080×1920); this one is ${width}×${height}`);
  }
  if (slot.needsTransparency && !meta.hasAlpha) {
    throw new HttpError(400, `"${slot.label}" must be cut out on a transparent background (PNG or WebP with transparency)`);
  }
}

async function blurPreview(webp: Buffer): Promise<string> {
  const tiny = await sharp(webp).resize({ width: BLUR_WIDTH }).webp({ quality: BLUR_QUALITY }).toBuffer();
  return `data:image/webp;base64,${tiny.toString('base64')}`;
}

/**
 * Read-modify-write of the manifest under a row lock, so two uploads to one design at the same
 * time both land. Re-validated so a bad URL or key never reaches what the browser renders.
 * Returns the manifest as it was before the change.
 */
async function updateManifest(id: string, change: (manifest: TemplateManifest) => TemplateManifest): Promise<TemplateManifest> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Template" WHERE "id" = ${id} FOR UPDATE`;
    const row = await tx.template.findUnique({ where: { id }, select: { componentKey: true, config: true } });
    if (!row) throw new HttpError(404, 'Template not found');
    const before = manifestFor(row);
    const checked = parseManifest(change(before));
    await tx.template.update({ where: { id }, data: { config: checked as unknown as Prisma.InputJsonValue } });
    return before;
  });
}

/** Stores one artwork file of an illustrated design (webp, transparency kept) and drops the replaced upload. */
export async function uploadTemplateAsset(storage: StorageProvider, id: string, file: string, data: Buffer) {
  const manifest = manifestFor(await findTemplate(id));
  const slot = slotOf(manifest, file);
  await checkArtwork(data, slot);
  const image = await toWebp(data, { maxSize: slot.isCover || file === 'bg.webp' ? FULL_SCREEN_MAX_SIZE : LAYER_MAX_SIZE });
  const blur = await blurPreview(image.data);
  // Stored before the lock is taken: the transaction stays short.
  const stored = await storage.save(image.data, 'webp');
  let previousKey: string | undefined;
  try {
    const before = await updateManifest(id, (current) => ({
      ...current,
      uploads: { ...current.uploads, [file]: stored.url },
      placeholders: { ...current.placeholders, [file]: blur },
      uploadKeys: { ...current.uploadKeys, [file]: stored.key },
    }));
    previousKey = before.uploadKeys?.[file];
  } catch (error: unknown) {
    await removeQuietly(storage, stored.key);
    throw error;
  }
  if (previousKey) await removeQuietly(storage, previousKey);
  return { file, url: stored.url, width: image.width, height: image.height };
}

/** Back to the file shipped in client/public/templates/<slug>/ (or the placeholder). */
export async function removeTemplateAsset(storage: StorageProvider, id: string, file: string) {
  slotOf(manifestFor(await findTemplate(id)), file);
  const without = <T>(record: Readonly<Record<string, T>> | undefined): Record<string, T> =>
    Object.fromEntries(Object.entries(record ?? {}).filter(([key]) => key !== file));
  const before = await updateManifest(id, (current) => ({
    ...current,
    uploads: without(current.uploads),
    placeholders: without(current.placeholders),
    uploadKeys: without(current.uploadKeys),
  }));
  const previousKey = before.uploadKeys?.[file];
  if (previousKey) await removeQuietly(storage, previousKey);
  return { file, url: assetUrl({ ...before, uploads: without(before.uploads) }, file) };
}

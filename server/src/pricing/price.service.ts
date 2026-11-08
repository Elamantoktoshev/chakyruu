import { INVITATION_PRICE_CODE } from '@chakyruu/shared';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

const TYIYN_PER_SOM = 100;

const priceSelect = { code: true, audience: true, amountSom: true, credits: true, active: true, sortOrder: true } as const;

export interface ActivePrice {
  code: string;
  amountSom: number;
  /** Payments store tyiyn to avoid floating point. */
  amountTyiyn: number;
  credits: number | null;
}

/**
 * Publish price of one design: its own price, or the shop-wide INVITATION_PUBLISH price.
 * Switching INVITATION_PUBLISH off in /admin still stops all sales, whatever the template price.
 */
export async function getTemplatePublishPrice(templatePriceSom: number | null): Promise<ActivePrice> {
  const shopPrice = await getActivePrice(INVITATION_PRICE_CODE);
  if (templatePriceSom === null) return shopPrice;
  return { ...shopPrice, amountSom: templatePriceSom, amountTyiyn: templatePriceSom * TYIYN_PER_SOM };
}

/** For display only (builder, catalog): null when publishing is not on sale. */
export async function findTemplatePublishPriceSom(templatePriceSom: number | null): Promise<number | null> {
  try {
    return (await getTemplatePublishPrice(templatePriceSom)).amountSom;
  } catch (error: unknown) {
    if (error instanceof HttpError) return null;
    throw error;
  }
}

/** An active price by code, or 503 if the admin switched it off. */
export async function getActivePrice(code: string): Promise<ActivePrice> {
  const price = await prisma.price.findFirst({ where: { code, active: true }, select: priceSelect });
  if (!price) throw new HttpError(503, 'This product is not on sale right now');
  return { code: price.code, amountSom: price.amountSom, amountTyiyn: price.amountSom * TYIYN_PER_SOM, credits: price.credits };
}

/** Prices shown on the landing page and checkout. */
export async function listPublicPrices() {
  return prisma.price.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    select: { code: true, audience: true, amountSom: true, credits: true },
  });
}

export async function listAllPrices() {
  return prisma.price.findMany({ orderBy: { sortOrder: 'asc' }, select: priceSelect });
}

export async function updatePrice(code: string, patch: { amountSom?: number; active?: boolean }) {
  const { count } = await prisma.price.updateMany({ where: { code }, data: patch });
  if (count === 0) throw new HttpError(404, 'Price not found');
  return prisma.price.findUniqueOrThrow({ where: { code }, select: priceSelect });
}

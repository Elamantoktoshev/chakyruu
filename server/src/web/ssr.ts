import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { PublicPage } from '@chakyruu/shared';
import { logger } from '../lib/logger.js';
import { listPublicPrices } from '../pricing/price.service.js';
import { listPublicTemplates } from '../templates/template.routes.js';
import { scriptSafeJson } from './json.js';

/** What client/src/entry-server.tsx exports (built to client/dist-ssr/entry-server.js). */
export interface SsrRenderInput {
  url: string;
  data: Record<string, unknown>;
  siteUrl: string;
}
export interface SsrRenderResult {
  html: string;
  head: string;
  lang: string | null;
}
export type SsrRender = (input: SsrRenderInput) => Promise<SsrRenderResult>;

/** Must match client/src/ssr/initialData.tsx. */
const INITIAL_DATA_ID = 'initial-data';

/** client/dist → client/dist-ssr/entry-server.js; null when the bundle is missing (dev, tests). */
export async function loadSsrRender(clientDir: string): Promise<SsrRender | null> {
  const file = path.join(clientDir, '..', 'dist-ssr', 'entry-server.js');
  if (!existsSync(file)) {
    logger.warn(`[ssr] ${file} not found — public pages are rendered in the browser only`);
    return null;
  }
  const module = (await import(pathToFileURL(file).href)) as { render?: SsrRender };
  if (typeof module.render !== 'function') throw new Error(`[ssr] ${file} does not export render()`);
  return module.render;
}

/** Only what each page shows: the landing needs designs and prices, the catalog only designs. */
export async function loadPageData(page: PublicPage): Promise<Record<string, unknown>> {
  if (page === '') {
    const [templates, prices] = await Promise.all([listPublicTemplates(), listPublicPrices()]);
    return { templates, prices };
  }
  if (page === 'templates') return { templates: await listPublicTemplates() };
  return {};
}

/** Default tags of index.html that the page's own head replaces. */
const DEFAULT_HEAD_TAGS = [
  /<title>[\s\S]*?<\/title>\s*/gi,
  /<meta\s+name="description"[^>]*>\s*/gi,
  /<meta\s+name="robots"[^>]*>\s*/gi,
  /<meta\s+property="og:[^"]*"[^>]*>\s*/gi,
  /<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi,
  /<link\s+rel="canonical"[^>]*>\s*/gi,
];

/** index.html with the rendered page: <html lang>, head tags, #root content and the data it was rendered with. */
export function composePage(indexHtml: string, result: SsrRenderResult, data: Record<string, unknown>): string {
  const withoutDefaults = result.head ? DEFAULT_HEAD_TAGS.reduce((html, pattern) => html.replace(pattern, ''), indexHtml) : indexHtml;
  const dataScript = `<script id="${INITIAL_DATA_ID}" type="application/json">${scriptSafeJson(data)}</script>`;
  return withoutDefaults
    .replace(/<html lang="[^"]*">/, `<html lang="${result.lang ?? 'ky'}">`)
    .replace('</head>', `  ${result.head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${result.html}</div>\n    ${dataScript}`);
}

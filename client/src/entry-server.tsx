import { StrictMode } from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { StaticRouter } from 'react-router';
import { AppShell } from './App';
import { buildHeadTags, type SeoMeta } from './seo/head';
import { SeoCollectorProvider } from './seo/Seo';
import type { InitialData } from './ssr/initialData';

export interface RenderInput {
  /** Path + query of the request ("/ru/templates?type=WEDDING"). */
  url: string;
  data: InitialData;
  /** https://chakyruu.kg — canonical and Open Graph URLs are absolute. */
  siteUrl: string;
}

export interface RenderResult {
  /** Inner HTML of #root. */
  html: string;
  /** Tags for <head>; empty when the page declares none. */
  head: string;
  /** ky / ru for <html lang>. */
  lang: string | null;
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Server render of a public page. prerender waits for lazy pages and Suspense, so the HTML is
 * complete — what search engines and link previews read without running JavaScript.
 */
export async function render({ url, data, siteUrl }: RenderInput): Promise<RenderResult> {
  let meta: SeoMeta | null = null;
  const { prelude } = await prerenderToNodeStream(
    <StrictMode>
      <SeoCollectorProvider value={(collected) => (meta = collected)}>
        <StaticRouter location={url}>
          <AppShell initialData={data} />
        </StaticRouter>
      </SeoCollectorProvider>
    </StrictMode>,
  );
  const html = await streamToString(prelude);
  const finalMeta = meta as SeoMeta | null;
  return { html, head: finalMeta ? buildHeadTags(finalMeta, siteUrl) : '', lang: finalMeta?.locale ?? null };
}

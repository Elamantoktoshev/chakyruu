import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { loadOgFonts } from './fonts.js';

/** Minimal JSX-free element tree for satori (it only needs `type` and `props`). */
export interface OgNode {
  type: string;
  props: { style?: Record<string, string | number>; children?: OgChild | OgChild[]; [attribute: string]: unknown };
}
export type OgChild = OgNode | string | null;

export function el(type: string, style: Record<string, string | number>, children?: OgChild | OgChild[], attributes: Record<string, unknown> = {}): OgNode {
  return { type, props: { ...attributes, style, children } };
}

export interface Size {
  width: number;
  height: number;
}

export const OG_SIZE: Size = { width: 1200, height: 630 };
export const STORY_SIZE: Size = { width: 1080, height: 1920 };

/** satori (layout + text → SVG) then resvg (SVG → PNG). */
export async function renderPng(node: OgNode, { width, height }: Size): Promise<Buffer> {
  const svg = await satori(node as unknown as Parameters<typeof satori>[0], { width, height, fonts: await loadOgFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
}

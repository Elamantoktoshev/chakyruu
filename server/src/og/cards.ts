import type { Palette } from '@chakyruu/shared';
import { SANS_STACK, SERIF_STACK } from './fonts.js';
import { el, type OgNode } from './render.js';

export interface CardContent {
  /** "ҮЙЛӨНҮҮ ТОЙ" */
  eyebrow: string;
  names: string;
  /** "Сиздерди тойго чакырабыз" */
  inviteLine: string;
  /** "15-июнь, 2027-ж. · 17:00"; null while the date is not set. */
  dateLine: string | null;
  venue: string | null;
  /** Caption above the QR code on the Stories picture. */
  scanLine: string;
  palette: Palette;
}

const SERIF = SERIF_STACK;
const SANS = SANS_STACK;
const SITE = 'chakyruu.kg';

/** Long names get a smaller size so they fit in two lines. */
function namesSize(names: string, base: number): number {
  if (names.length <= 18) return base;
  if (names.length <= 28) return Math.round(base * 0.84);
  if (names.length <= 40) return Math.round(base * 0.68);
  return Math.round(base * 0.56);
}

/** Thin line with a diamond in the middle, like the site's ornament dividers. */
function divider(accent: string, width: number): OgNode {
  const line = el('div', { width: width / 2 - 18, height: 2, backgroundColor: accent, opacity: 0.7 });
  const diamond = el('div', { width: 14, height: 14, backgroundColor: accent, transform: 'rotate(45deg)', margin: '0 11px' });
  return el('div', { display: 'flex', alignItems: 'center', justifyContent: 'center' }, [line, diamond, line]);
}

/** Gold frame inset from the edge, with small diamonds at the corners. */
function frame(accent: string, inset: number): OgNode {
  const corner = (position: Record<string, number>) =>
    el('div', { position: 'absolute', width: 18, height: 18, backgroundColor: accent, transform: 'rotate(45deg)', ...position });
  const half = 9;
  return el('div', { position: 'absolute', top: inset, left: inset, right: inset, bottom: inset, display: 'flex', border: `2px solid ${accent}`, borderRadius: 28 }, [
    corner({ top: -half, left: -half }),
    corner({ top: -half, right: -half }),
    corner({ bottom: -half, left: -half }),
    corner({ bottom: -half, right: -half }),
  ]);
}

function details(content: CardContent, scale: number): OgNode[] {
  const { palette } = content;
  const text = (value: string, size: number, opacity: number) =>
    el('div', { fontFamily: SANS, fontWeight: 500, fontSize: size * scale, color: palette.background, opacity, textAlign: 'center' }, value);
  return [
    ...(content.dateLine ? [text(content.dateLine, 34, 0.92)] : []),
    ...(content.venue ? [text(content.venue, 28, 0.75)] : []),
  ];
}

/** 1200×630 link preview for WhatsApp / Telegram / Facebook. */
export function ogCard(content: CardContent): OgNode {
  const { palette } = content;
  return el('div', { width: '100%', height: '100%', display: 'flex', position: 'relative', backgroundColor: palette.primary }, [
    frame(palette.accent, 28),
    el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '70px 110px', gap: 22 }, [
      el('div', { fontFamily: SANS, fontWeight: 600, fontSize: 24, letterSpacing: 6, color: palette.accent }, content.eyebrow),
      el(
        'div',
        { fontFamily: SERIF, fontWeight: 700, fontSize: namesSize(content.names, 92), lineHeight: 1.1, color: palette.background, textAlign: 'center', maxWidth: 980 },
        content.names,
      ),
      divider(palette.accent, 260),
      ...details(content, 1),
      el('div', { position: 'absolute', bottom: 52, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: 2, color: palette.accent }, SITE),
    ]),
  ]);
}

/** 1080×1920 picture for Instagram / WhatsApp Stories, with a QR code to the invitation. */
export function storyCard(content: CardContent, qrDataUri: string, linkText: string): OgNode {
  const { palette } = content;
  return el('div', { width: '100%', height: '100%', display: 'flex', position: 'relative', backgroundColor: palette.primary }, [
    frame(palette.accent, 48),
    el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '210px 120px 150px' }, [
      el('div', { fontFamily: SANS, fontWeight: 600, fontSize: 34, letterSpacing: 9, color: palette.accent }, content.eyebrow),
      el('div', { fontFamily: SANS, fontWeight: 500, fontSize: 40, color: palette.background, opacity: 0.85, marginTop: 70, textAlign: 'center' }, content.inviteLine),
      el(
        'div',
        { fontFamily: SERIF, fontWeight: 700, fontSize: namesSize(content.names, 138), lineHeight: 1.08, color: palette.background, textAlign: 'center', marginTop: 40, maxWidth: 840 },
        content.names,
      ),
      el('div', { display: 'flex', marginTop: 60, marginBottom: 50 }, divider(palette.accent, 360)),
      el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }, details(content, 1.45)),
      el('div', { flexGrow: 1, display: 'flex' }),
      el('div', { fontFamily: SANS, fontWeight: 500, fontSize: 34, color: palette.background, opacity: 0.8, marginBottom: 34 }, content.scanLine),
      el('div', { display: 'flex', padding: 22, backgroundColor: '#ffffff', borderRadius: 32 }, el('img', { width: 300, height: 300 }, null, { src: qrDataUri, width: 300, height: 300 })),
      el('div', { fontFamily: SANS, fontWeight: 600, fontSize: 32, color: palette.accent, marginTop: 34 }, linkText),
    ]),
  ]);
}

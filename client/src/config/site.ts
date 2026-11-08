/**
 * Public contacts shown in the footer.
 * TODO: Instagram / TikTok / e-mail are still placeholders — replace before launch.
 */
export const SITE_CONTACTS = {
  whatsapp: '+996222161602',
  instagram: 'chakyruu.kg',
  tiktok: 'chakyruu.kg',
  email: 'hello@chakyruu.kg',
} as const;

export const whatsappHref = `https://wa.me/${SITE_CONTACTS.whatsapp.replace(/\D/g, '')}`;
export const instagramHref = `https://www.instagram.com/${SITE_CONTACTS.instagram}/`;
export const tiktokHref = `https://www.tiktok.com/@${SITE_CONTACTS.tiktok}`;

/** wa.me link with a ready first message (the text is URL-encoded). */
export function whatsappMessageHref(text: string): string {
  return `${whatsappHref}?text=${encodeURIComponent(text)}`;
}

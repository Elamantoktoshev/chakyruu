/**
 * Public contacts shown in the footer.
 * TODO: replace the placeholders with the real WhatsApp / Instagram / TikTok / e-mail before launch.
 */
export const SITE_CONTACTS = {
  whatsapp: '+996700000000',
  instagram: 'chakyruu.kg',
  tiktok: 'chakyruu.kg',
  email: 'hello@chakyruu.kg',
} as const;

export const whatsappHref = `https://wa.me/${SITE_CONTACTS.whatsapp.replace(/\D/g, '')}`;
export const instagramHref = `https://www.instagram.com/${SITE_CONTACTS.instagram}/`;
export const tiktokHref = `https://www.tiktok.com/@${SITE_CONTACTS.tiktok}`;

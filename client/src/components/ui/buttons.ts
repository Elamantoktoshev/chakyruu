/** Shared button looks for the site UI (not for invitation templates). */
const base =
  'inline-flex min-h-13 items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-7 font-display text-base font-bold transition focus-visible:outline-none focus-visible:ring-4';

export const primaryButton = `${base} bg-brand text-white shadow-lg shadow-brand/25 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-xl hover:shadow-brand/30 focus-visible:ring-brand/30`;

export const secondaryButton = `${base} border-2 border-line bg-white text-night hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand focus-visible:ring-brand/20`;

export const whatsappButton = `${base} bg-whatsapp text-white shadow-lg shadow-whatsapp/25 hover:-translate-y-0.5 hover:brightness-105 focus-visible:ring-whatsapp/30`;

/** WhatsApp on a dark band next to the green primary button: light so the two stay distinct. */
export const whatsappLightButton = `${base} bg-white text-night hover:-translate-y-0.5 hover:bg-mint-soft focus-visible:ring-white/40`;

/** Small coloured pill above section titles. */
export const eyebrow = 'inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-brand';

/** Section heading on the light site background. */
export const sectionTitle = 'font-display text-3xl font-extrabold leading-tight tracking-tight text-night sm:text-[2.6rem]';

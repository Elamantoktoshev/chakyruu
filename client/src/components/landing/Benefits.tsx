import type { ReactElement } from 'react';
import { useI18n } from '../../i18n/LanguageContext';
import { Reveal } from '../Reveal';
import { HeartIcon, LanguageIcon, LinkIcon, MapIcon, MusicIcon, TapIcon } from './LandingIcons';

const ICONS: Readonly<Record<string, () => ReactElement>> = {
  link: () => <LinkIcon />,
  rsvp: () => <TapIcon />,
  music: () => <MusicIcon />,
  map: () => <MapIcon />,
  tilek: () => <HeartIcon />,
  lang: () => <LanguageIcon />,
};

/** "Эмне үчүн биз": six benefits; the first card is larger (bento) so the page has a focal point. */
export function Benefits() {
  const { t } = useI18n();
  const entries = Object.entries(t.benefits);

  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <Reveal className="max-w-2xl">
        <h2 className="font-serif text-4xl text-graphite sm:text-5xl">{t.benefitsTitle}</h2>
        <p className="mt-3 text-lg text-ink/65">{t.benefitsSubtitle}</p>
      </Reveal>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([key, [title = '', text = '']], index) => (
          <Reveal
            key={key}
            as="li"
            delayMs={index * 60}
            className={`group rounded-3xl border p-6 transition hover:-translate-y-1 hover:shadow-xl ${
              index === 0
                ? 'border-burgundy bg-burgundy text-cream shadow-lg shadow-burgundy/20 sm:row-span-2 lg:p-8'
                : 'border-gold/40 bg-white/70 text-ink'
            }`}
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${index === 0 ? 'bg-gold text-burgundy-dark' : 'bg-burgundy/10 text-burgundy'}`}>
              {ICONS[key]?.()}
            </span>
            <h3 className={`mt-5 font-serif ${index === 0 ? 'text-3xl' : 'text-xl'}`}>{title}</h3>
            <p className={`mt-2 leading-relaxed ${index === 0 ? 'text-cream/80' : 'text-ink/65'}`}>{text}</p>
            {index === 0 && (
              <p className="mt-8 rounded-2xl bg-white/10 p-4 font-serif text-lg italic text-gold-light">«Урматтуу Асан байке, сизди тойго чакырабыз!»</p>
            )}
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

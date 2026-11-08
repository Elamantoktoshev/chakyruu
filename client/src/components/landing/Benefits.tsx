import type { ReactElement } from 'react';
import { useI18n } from '../../i18n/LanguageContext';
import { Reveal } from '../Reveal';
import { eyebrow, sectionTitle } from '../ui/buttons';
import { HeartIcon, LanguageIcon, LinkIcon, MapIcon, MusicIcon, TapIcon } from './LandingIcons';

const ICONS: Readonly<Record<string, () => ReactElement>> = {
  link: () => <LinkIcon />,
  rsvp: () => <TapIcon />,
  music: () => <MusicIcon />,
  map: () => <MapIcon />,
  tilek: () => <HeartIcon />,
  lang: () => <LanguageIcon />,
};

/** Card background, icon tile and corner glow per benefit; each card gets its own colour. */
const TONES: readonly { card: string; icon: string; glow: string }[] = [
  { card: 'bg-brand-soft', icon: 'bg-brand text-white shadow-brand/30', glow: 'bg-brand/15' },
  { card: 'bg-rose-soft', icon: 'bg-rose text-white shadow-rose/30', glow: 'bg-rose/15' },
  { card: 'bg-lilac-soft', icon: 'bg-lilac text-white shadow-lilac/30', glow: 'bg-lilac/15' },
  { card: 'bg-sky-soft', icon: 'bg-sky text-white shadow-sky/30', glow: 'bg-sky/15' },
  { card: 'bg-peach-soft', icon: 'bg-peach text-white shadow-peach/30', glow: 'bg-peach/15' },
  { card: 'bg-lemon-soft', icon: 'bg-lemon text-white shadow-lemon/30', glow: 'bg-lemon/20' },
];

/** "Эмне үчүн биз": six colour-coded benefit cards. */
export function Benefits() {
  const { t } = useI18n();
  const entries = Object.entries(t.benefits);

  return (
    <section className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className={eyebrow}>Chakyruu.kg</p>
        <h2 className={`mt-4 ${sectionTitle}`}>{t.benefitsTitle}</h2>
        <p className="mt-3 text-lg text-muted">{t.benefitsSubtitle}</p>
      </Reveal>
      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([key, [title = '', text = '']], index) => {
          const tone = TONES[index % TONES.length] ?? TONES[0];
          return (
            <Reveal
              key={key}
              as="li"
              delayMs={index * 60}
              className={`group relative overflow-hidden rounded-3xl border border-white p-7 transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-night/5 ${tone?.card}`}
            >
              <span className={`absolute -right-10 -top-10 h-32 w-32 rounded-full transition duration-500 group-hover:scale-125 ${tone?.glow}`} aria-hidden="true" />
              <span className={`relative flex h-13 w-13 items-center justify-center rounded-2xl shadow-lg ${tone?.icon}`}>{ICONS[key]?.()}</span>
              <h3 className="relative mt-6 font-display text-xl font-bold text-night">{title}</h3>
              <p className="relative mt-2 leading-relaxed text-muted">{text}</p>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}

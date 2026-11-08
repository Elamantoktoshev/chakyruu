import { EVENT_TYPES, type EventType } from '@chakyruu/shared';
import type { ReactElement } from 'react';
import type { Template } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';
import { FlowerCorner, KyrgyzStar, MoonStars, OyuMedallion } from '../art/Patterns';
import { Mountains } from '../art/Mountains';
import { Reveal } from '../Reveal';
import { eyebrow, sectionTitle } from '../ui/buttons';
import { ArrowRightIcon } from '../ui/SiteIcons';

/** Ornamental cover per toi type, drawn in SVG (no photos needed). */
const COVERS: Readonly<Record<EventType, { tile: string; art: () => ReactElement }>> = {
  WEDDING: {
    tile: 'bg-gradient-to-br from-[#8e2433] to-[#4f1119] text-white',
    art: () => (
      <>
        <OyuMedallion className="absolute -right-12 top-2 h-64 w-64 text-gold opacity-40 transition duration-700 group-hover:rotate-45" />
        <OyuMedallion className="absolute -left-16 -top-16 h-40 w-40 text-gold opacity-15" />
      </>
    ),
  },
  KYZ_UZATUU: {
    tile: 'bg-gradient-to-br from-[#fde4ea] to-[#f6c6d3] text-[#5c2434]',
    art: () => <FlowerCorner className="absolute -right-2 -top-2 h-20 w-20 opacity-90 transition duration-700 group-hover:scale-110" />,
  },
  BESHIK: {
    tile: 'bg-gradient-to-br from-[#e3f0ff] to-[#bcd8f6] text-[#1d3a5c]',
    art: () => <MoonStars className="absolute right-2 top-1 h-20 w-36 transition duration-700 group-hover:-translate-y-1" />,
  },
  SUNNOT: {
    tile: 'bg-gradient-to-br from-[#1f2f57] to-[#0f1830] text-white',
    art: () => <KyrgyzStar className="absolute -right-8 -top-8 h-44 w-44 text-gold opacity-50 transition duration-700 group-hover:rotate-90" />,
  },
  MAARAKE: {
    tile: 'bg-gradient-to-br from-[#2a2420] to-[#0e0c0b] text-[#f3e3b5]',
    art: () => (
      <>
        <Mountains className="absolute inset-x-0 bottom-0 h-24 w-full text-gold opacity-30" />
        <OyuMedallion className="absolute -right-6 -top-6 h-36 w-36 text-gold opacity-40 transition duration-700 group-hover:rotate-45" />
      </>
    ),
  },
  KECHE: {
    tile: 'bg-gradient-to-br from-[#f3e8ff] to-[#d9c3f7] text-[#3b1d5c]',
    art: () => <KyrgyzStar className="absolute -right-4 -top-4 h-28 w-28 text-lilac opacity-50 transition duration-700 group-hover:rotate-45" />,
  },
  OTHER: {
    tile: 'bg-gradient-to-br from-[#e8f7ef] to-[#bfe8d2] text-[#0f3d2b]',
    art: () => <OyuMedallion className="absolute -right-6 -top-6 h-32 w-32 text-brand opacity-30 transition duration-700 group-hover:rotate-45" />,
  },
};

type Props = { templates: readonly Template[]; onSelect: (type: EventType) => void };

/** Bento of toi types; a tile filters the template catalog below and scrolls to it. */
export function CategoryGrid({ templates, onSelect }: Props) {
  const { t } = useI18n();
  const countFor = (type: EventType) => templates.filter((template) => template.type === type || template.isUniversal).length;

  return (
    <section className="mx-auto max-w-6xl px-5 pb-6 pt-10 lg:pt-12">
      <Reveal className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className={eyebrow}>{t.categoriesEyebrow}</p>
          <h2 className={`mt-4 ${sectionTitle}`}>{t.categoriesTitle}</h2>
        </div>
        <p className="max-w-md text-lg text-muted">{t.categoriesSubtitle}</p>
      </Reveal>
      <ul className="mt-10 grid auto-rows-[11.5rem] gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {EVENT_TYPES.map((type, index) => {
          const cover = COVERS[type];
          return (
            <Reveal key={type} as="li" delayMs={index * 70} className={index === 0 ? 'sm:col-span-2 sm:row-span-2' : ''}>
              <button
                type="button"
                onClick={() => onSelect(type)}
                className={`group relative flex h-full w-full flex-col justify-end overflow-hidden rounded-3xl p-6 text-left shadow-lg shadow-night/5 transition duration-300 hover:-translate-y-1 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30 ${cover.tile}`}
              >
                {cover.art()}
                <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/25 to-transparent mix-blend-multiply" aria-hidden="true" />
                <span className="absolute left-5 top-5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
                  {t.templatesCount.replace('{n}', String(countFor(type)))}
                </span>
                <span className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur transition group-hover:bg-white group-hover:text-night">
                  <ArrowRightIcon className="h-5 w-5" />
                </span>
                <span className={`relative font-display font-extrabold ${index === 0 ? 'text-4xl' : 'text-2xl'}`}>{t.eventTypes[type]}</span>
                <span className={`relative mt-1 max-w-xs text-sm opacity-80 ${index === 0 ? 'sm:text-base' : ''}`}>{t.categoryTexts[type]}</span>
              </button>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}

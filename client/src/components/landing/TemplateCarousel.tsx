import { EVENT_TYPES, type EventType } from '@chakyruu/shared';
import { useState } from 'react';
import { Link } from 'react-router';
import type { Template } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';
import { Reveal } from '../Reveal';
import { TemplateCard } from '../TemplateCard';

type Props = { templates: readonly Template[]; createHref: (templateId: string) => string };

/** Horizontal, swipeable gallery of live template previews with a toi-type filter. */
export function TemplateCarousel({ templates, createHref }: Props) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<EventType | 'ALL'>('ALL');
  const visible = filter === 'ALL' ? templates : templates.filter((template) => template.type === filter || template.isUniversal);
  const chip = (isActive: boolean) =>
    `min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition ${
      isActive ? 'border-burgundy bg-burgundy text-cream' : 'border-gold/50 bg-white/70 text-burgundy hover:border-burgundy/60'
    }`;

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className="font-serif text-4xl text-graphite sm:text-5xl">{t.templatesTitle}</h2>
          <p className="mt-3 text-lg text-ink/65">{t.templatesSubtitle}</p>
        </Reveal>
        <div className="-mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none]" role="tablist">
          <button type="button" role="tab" aria-selected={filter === 'ALL'} onClick={() => setFilter('ALL')} className={chip(filter === 'ALL')}>
            {t.filterAllTemplates}
          </button>
          {EVENT_TYPES.map((type) => (
            <button key={type} type="button" role="tab" aria-selected={filter === type} onClick={() => setFilter(type)} className={chip(filter === type)}>
              {t.eventTypes[type]}
            </button>
          ))}
        </div>
      </div>
      <ul className="mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 [scrollbar-width:none] lg:px-[max(1.25rem,calc((100vw-72rem)/2+1.25rem))]">
        {visible.map((template) => (
          <li key={template.id} className="w-72 shrink-0 snap-start [contain-intrinsic-size:288px_380px] [content-visibility:auto]">
            <TemplateCard template={template} />
            <Link
              to={createHref(template.id)}
              className="mt-3 flex min-h-12 items-center justify-center rounded-full border-2 border-burgundy font-semibold text-burgundy transition hover:bg-burgundy hover:text-cream"
            >
              {t.useTemplate}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

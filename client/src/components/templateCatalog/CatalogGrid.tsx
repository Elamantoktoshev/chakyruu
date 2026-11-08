import { EVENT_TYPES, type EventType } from '@chakyruu/shared';
import { useState } from 'react';
import type { Template } from '../../api/types';
import { useReveal } from '../../hooks/useReveal';
import { useI18n } from '../../i18n/LanguageContext';
import { TemplateDemoDialog } from '../landing/TemplateDemoDialog';
import { CatalogCard } from './CatalogCard';

export type CatalogFilter = EventType | 'ALL';

type Props = {
  templates: readonly Template[];
  filter: CatalogFilter;
  onFilterChange: (filter: CatalogFilter) => void;
  templateHref: (templateId: string) => string;
  /** Landing page: only the first few designs. */
  limit?: number;
};

export function matchesFilter(template: Template, filter: CatalogFilter): boolean {
  return filter === 'ALL' || template.type === filter || template.isUniversal;
}

/** Filter pills, the responsive grid of design cards and the demo dialog. */
export function CatalogGrid({ templates, filter, onFilterChange, templateHref, limit }: Props) {
  const { t } = useI18n();
  const [demo, setDemo] = useState<Template | null>(null);
  // Each card renders a preview: that work waits until the grid is near the screen.
  const { ref: gridRef, isVisible: isNear } = useReveal<HTMLUListElement>();
  const matching = templates.filter((template) => matchesFilter(template, filter));
  const visible = limit === undefined ? matching : matching.slice(0, limit);
  const pill = (isActive: boolean) =>
    `min-h-11 shrink-0 rounded-full px-4 text-sm font-bold transition ${
      isActive ? 'bg-night text-white shadow-lg shadow-night/20' : 'bg-white text-night/70 ring-1 ring-line hover:text-brand hover:ring-brand/40'
    }`;
  const label = (type: EventType) => t.eventTypeFilters[type] ?? t.eventTypes[type];

  return (
    <>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" role="tablist">
        <button type="button" role="tab" aria-selected={filter === 'ALL'} onClick={() => onFilterChange('ALL')} className={pill(filter === 'ALL')}>
          {t.filterAllTemplates}
        </button>
        {EVENT_TYPES.map((type) => (
          <button key={type} type="button" role="tab" aria-selected={filter === type} onClick={() => onFilterChange(type)} className={pill(filter === type)}>
            {label(type)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 rounded-3xl border border-dashed border-line bg-white/70 p-10 text-center text-muted">{t.tplEmpty}</p>
      ) : (
        <ul ref={gridRef} className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((template) => (
            <li key={template.id} className="flex">
              <CatalogCard template={template} isRendered={isNear} customizeHref={templateHref(template.id)} onDemo={setDemo} />
            </li>
          ))}
        </ul>
      )}
      <TemplateDemoDialog template={demo} templateHref={templateHref} onClose={() => setDemo(null)} />
    </>
  );
}

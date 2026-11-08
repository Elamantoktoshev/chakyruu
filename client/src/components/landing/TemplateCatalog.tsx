import { Link } from 'react-router';
import type { Template } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';
import { Reveal } from '../Reveal';
import { CatalogGrid, type CatalogFilter } from '../templateCatalog/CatalogGrid';
import { CatalogHeading } from '../templateCatalog/CatalogHeading';
import { secondaryButton } from '../ui/buttons';
import { ArrowRightIcon } from '../ui/SiteIcons';

export type { CatalogFilter } from '../templateCatalog/CatalogGrid';

/** Designs shown on the landing page before "all designs". */
const LANDING_LIMIT = 6;

type Props = {
  templates: readonly Template[];
  filter: CatalogFilter;
  onFilterChange: (filter: CatalogFilter) => void;
  templateHref: (templateId: string) => string;
};

/** Landing excerpt of the /templates catalog: same cards, first six, then a link to the full page. */
export function TemplateCatalog({ templates, filter, onFilterChange, templateHref }: Props) {
  const { t } = useI18n();
  const allHref = filter === 'ALL' ? '/templates' : `/templates?type=${filter}`;
  return (
    <section id="templates" className="scroll-mt-20 bg-gradient-to-b from-white via-brand-soft/60 to-white py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mb-8">
          <CatalogHeading title={t.tplCatalogTitle} subtitle={t.tplCatalogSubtitle} />
        </Reveal>
        <CatalogGrid templates={templates} filter={filter} onFilterChange={onFilterChange} templateHref={templateHref} limit={LANDING_LIMIT} />
        <div className="mt-10 flex justify-center">
          <Link to={allHref} className={`group ${secondaryButton}`}>
            {t.tplSeeAll}
            <ArrowRightIcon className="h-5 w-5 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

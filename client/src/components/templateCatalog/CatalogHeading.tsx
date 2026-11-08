import { useI18n } from '../../i18n/LanguageContext';

type Props = { title: string; subtitle?: string; isPageTitle?: boolean };

/** "— КАТАЛОГ" eyebrow with a rule, then the title with its last word in italics. */
export function CatalogHeading({ title, subtitle, isPageTitle = false }: Props) {
  const { t } = useI18n();
  const words = title.split(' ');
  const last = words.pop() ?? '';
  const Heading = isPageTitle ? 'h1' : 'h2';
  return (
    <div>
      <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-brand">
        <span className="h-px w-10 bg-brand" aria-hidden="true" />
        {t.tplCatalogEyebrow}
      </p>
      <Heading className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight text-night sm:text-5xl">
        {words.join(' ')} <span className="font-serif font-medium italic text-brand">{last}</span>
      </Heading>
      {subtitle && <p className="mt-3 max-w-xl text-lg text-muted">{subtitle}</p>}
    </div>
  );
}

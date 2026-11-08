import { ILLUSTRATED_TEMPLATE_KEY, manifestOf, resolvePalette, type TemplateFeature } from '@chakyruu/shared';
import { Link } from 'react-router';
import type { Template } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';
import { mixHex } from '../../lib/theme';
import { PlayIcon } from '../ui/SiteIcons';
import { CatalogPhone } from './CatalogPhone';

type Props = {
  template: Template;
  /** Mini previews are rendered only once the grid is near the screen. */
  isRendered: boolean;
  customizeHref: string;
  onDemo: (template: Template) => void;
};

/** Names on the closed cover of the preview (same in both languages). */
const SAMPLE_NAMES = 'Айбек & Айзада';

/** Pastel behind the phone: the manifest's own, or a light tint of the drawn template's colours. */
function cardTint(template: Template): string {
  const manifest = template.componentKey === ILLUSTRATED_TEMPLATE_KEY ? manifestOf(template.config) : null;
  if (manifest) return manifest.palette.card;
  const palette = resolvePalette(template.componentKey, null);
  return mixHex(palette.background, palette.primary, 0.1);
}

function featuresOf(template: Template, fallback: readonly TemplateFeature[]): readonly TemplateFeature[] {
  const manifest = template.componentKey === ILLUSTRATED_TEMPLATE_KEY ? manifestOf(template.config) : null;
  return manifest && manifest.features.length > 0 ? manifest.features : fallback;
}

/** One design in the catalog: phone preview, badges, name and price, description, tags, actions. */
export function CatalogCard({ template, isRendered, customizeHref, onDemo }: Props) {
  const { t, lang } = useI18n();
  const description = template.description[lang === 'KY' ? 'ky' : 'ru'] || t.categoryTexts[template.type];

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-night/10">
      <div className="relative px-6 pb-7 pt-10" style={{ backgroundColor: cardTint(template) }}>
        <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-night shadow-sm">
          {t.eventTypes[template.type]}
        </span>
        {template.badge && (
          <span className="absolute right-4 top-4 rounded-full bg-brand px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
            {t.tplBadges[template.badge]}
          </span>
        )}
        <CatalogPhone template={template} isRendered={isRendered} label={SAMPLE_NAMES} />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-2xl text-night">{template.name}</h3>
          {template.priceSom !== null && (
            <p className="shrink-0 font-display text-lg font-extrabold text-brand">
              {t.tplPriceSom.replace('{price}', template.priceSom.toLocaleString('ru-RU'))}
            </p>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{description}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {featuresOf(template, t.tplDrawnFeatures).map((feature) => (
            <li key={feature} className="rounded-lg bg-night/5 px-2.5 py-1 text-xs font-medium text-muted">
              {t.tplFeatures[feature]}
            </li>
          ))}
        </ul>
        <div className="mt-auto grid grid-cols-[auto_1fr] gap-2 pt-5">
          <button
            type="button"
            onClick={() => onDemo(template)}
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border-2 border-line px-4 font-display text-sm font-bold text-night transition hover:border-brand/40 hover:text-brand"
          >
            <PlayIcon className="h-4 w-4" />
            {t.templateDemo}
          </button>
          <Link
            to={customizeHref}
            className="flex min-h-12 items-center justify-center rounded-xl bg-brand px-4 font-display text-sm font-bold text-white shadow-md shadow-brand/25 transition hover:bg-brand-dark"
          >
            {t.tplCustomize}
          </Link>
        </div>
      </div>
    </article>
  );
}

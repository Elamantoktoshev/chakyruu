import { TEMPLATE_CATALOG, isTemplateKey, resolvePalette } from '@chakyruu/shared';
import { useI18n } from '../i18n/LanguageContext';

type Props = {
  componentKey: string;
  paletteId: string | null;
  onChange: (paletteId: string) => void;
};

/** Colour swatches of the current template (3–5 per template). */
export function PalettePicker({ componentKey, paletteId, onChange }: Props) {
  const { t, lang } = useI18n();
  if (!isTemplateKey(componentKey)) return null;
  const current = resolvePalette(componentKey, paletteId);

  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink/80">{t.fieldPalette}</legend>
      <div className="flex flex-wrap gap-3">
        {TEMPLATE_CATALOG[componentKey].palettes.map((palette) => {
          const isSelected = palette.id === current.id;
          const label = lang === 'KY' ? palette.label.ky : palette.label.ru;
          return (
            <button
              key={palette.id}
              type="button"
              aria-pressed={isSelected}
              aria-label={label}
              title={label}
              onClick={() => onChange(palette.id)}
              className={`flex min-h-12 items-center gap-2 rounded-full border-2 py-1.5 pl-1.5 pr-3 text-sm transition ${
                isSelected ? 'border-burgundy bg-white' : 'border-gold/40 bg-white/60'
              }`}
            >
              <span
                className="h-8 w-8 shrink-0 rounded-full border border-black/10"
                style={{ background: `conic-gradient(${palette.primary} 0 50%, ${palette.accent} 50% 75%, ${palette.background} 75%)` }}
                aria-hidden="true"
              />
              {label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

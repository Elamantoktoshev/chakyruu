import { OPENING_ANIMATIONS, type OpeningAnimation } from '@chakyruu/shared';
import { useI18n } from '../i18n/LanguageContext';
import { ChoiceChips } from './fields';

type Props = { value: OpeningAnimation; onChange: (value: OpeningAnimation) => void };

/** Opening scene of the invitation; previewed in the phone frame. */
export function OpeningPicker({ value, onChange }: Props) {
  const { t } = useI18n();
  return (
    <div className="space-y-1">
      <ChoiceChips
        label={t.fieldOpening}
        options={OPENING_ANIMATIONS.map((animation) => ({ value: animation, label: t.openingNames[animation] }))}
        value={value}
        onChange={onChange}
      />
      <p className="text-xs text-ink/55">{t.fieldOpeningHint}</p>
    </div>
  );
}

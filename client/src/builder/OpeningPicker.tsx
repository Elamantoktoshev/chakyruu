import { OPENING_ANIMATIONS, type OpeningAnimation } from '@chakyruu/shared';
import { useI18n } from '../i18n/LanguageContext';
import { ChoiceChips } from './fields';

type Props = {
  value: OpeningAnimation;
  onChange: (value: OpeningAnimation) => void;
  /** Illustrated templates bring their own layered opening: offered first. */
  hasTemplateOpening: boolean;
};

/** Opening scene of the invitation; previewed in the phone frame. */
export function OpeningPicker({ value, onChange, hasTemplateOpening }: Props) {
  const { t } = useI18n();
  const choices = hasTemplateOpening
    ? (['TEMPLATE', ...OPENING_ANIMATIONS.filter((animation) => animation !== 'TEMPLATE')] as const)
    : OPENING_ANIMATIONS.filter((animation) => animation !== 'TEMPLATE');
  return (
    <div className="space-y-1">
      <ChoiceChips
        label={t.fieldOpening}
        options={choices.map((animation) => ({ value: animation, label: t.openingNames[animation] }))}
        value={value}
        onChange={onChange}
      />
      <p className="text-xs text-night/55">{t.fieldOpeningHint}</p>
    </div>
  );
}

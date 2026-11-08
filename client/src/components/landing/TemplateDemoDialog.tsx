import { ILLUSTRATED_TEMPLATE_KEY } from '@chakyruu/shared';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import type { Template } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';
import { InvitationView } from '../invitation/InvitationView';
import { PhoneFrame } from '../PhoneFrame';
import { sampleInvitation } from '../TemplateCard';
import { primaryButton } from '../ui/buttons';
import { CloseIcon } from '../ui/SiteIcons';

type Props = { template: Template | null; templateHref: (templateId: string) => string; onClose: () => void };

/** Full demo of one template in a phone, over the page (native <dialog>: focus trap and Esc for free). */
export function TemplateDemoDialog({ template, templateHref, onClose }: Props) {
  const { t, lang } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (template && !dialog.open) dialog.showModal();
    if (!template && dialog.open) dialog.close();
  }, [template]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => event.target === dialogRef.current && onClose()}
      aria-label={template?.name}
      className="m-auto max-h-none max-w-none bg-transparent p-4 backdrop:bg-night/70 backdrop:backdrop-blur-sm"
    >
      {template && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex w-full max-w-[22rem] items-center justify-between text-white">
            <p className="font-display text-lg font-bold">{template.name}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.templateDemoClose}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/30"
            >
              <CloseIcon />
            </button>
          </div>
          <PhoneFrame>
            <InvitationView
              invitation={{ ...sampleInvitation(template, lang), openingAnimation: template.componentKey === ILLUSTRATED_TEMPLATE_KEY ? 'TEMPLATE' : 'ENVELOPE' }}
              lang={lang}
              mode="preview"
              opening={{ doorLabel: lang === 'KY' ? 'Урматтуу Асан байке' : 'Уважаемый Асан' }}
            />
          </PhoneFrame>
          <Link to={templateHref(template.id)} className={`${primaryButton} w-full max-w-[22rem]`}>
            {t.useTemplate}
          </Link>
        </div>
      )}
    </dialog>
  );
}

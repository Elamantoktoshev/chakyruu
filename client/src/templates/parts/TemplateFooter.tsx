import type { ReactNode } from 'react';
import type { InvitationContent } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';

type Props = { invitation: InvitationContent; className?: string; decoration?: ReactNode };

/** Closing block with the names and the "made with Chakyruu.kg" line. */
export function TemplateFooter({ invitation, className = 'bg-burgundy text-cream', decoration }: Props) {
  const { t } = useI18n();
  return (
    <footer className={`pb-8 pt-1 text-center ${className}`}>
      {decoration}
      <p className="mt-6 font-serif text-2xl">{invitation.hostNames}</p>
      {/* Every invitation advertises the platform, except partner gifts that chose to hide it. */}
      {!invitation.hideBranding && (
        <a href="/" className="mt-4 inline-flex min-h-11 items-center px-3 text-xs underline-offset-4 opacity-70 hover:underline">
          {t.brandingLine}
        </a>
      )}
    </footer>
  );
}

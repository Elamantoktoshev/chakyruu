import type { ReactNode } from 'react';
import type { InvitationContent } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';

type Props = {
  invitation: InvitationContent;
  greeting?: ReactNode;
  /** Classes for the names line (font size / style differ per template). */
  namesClassName?: string;
  className?: string;
};

/** Event type, the hosts' names, the invitation line and the 18+ badge. */
export function HeroText({ invitation, greeting, namesClassName = 'text-5xl font-bold', className = '' }: Props) {
  const { t } = useI18n();
  return (
    <div className={`animate-fade-up ${className}`}>
      {greeting}
      <p className="text-xs uppercase tracking-[0.35em] opacity-80">{t.eventTypes[invitation.eventType]}</p>
      <h1 className={`mt-3 break-words font-serif leading-tight ${namesClassName}`}>{invitation.hostNames || '…'}</h1>
      <p className="mt-3 font-serif text-lg italic opacity-90">{t.inviteSubtitle[invitation.eventType]}</p>
      {invitation.adultsOnly && (
        <p className="mt-4 inline-block rounded-full border border-current px-3 py-1 text-xs font-semibold tracking-wide opacity-90">
          {t.adultsOnly}
        </p>
      )}
    </div>
  );
}

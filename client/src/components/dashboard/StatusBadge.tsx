import type { InvitationStatus } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';

const STYLE: Record<InvitationStatus, string> = {
  DRAFT: 'bg-amber-100 text-amber-900',
  PAID: 'bg-sky-100 text-sky-900',
  PUBLISHED: 'bg-emerald-100 text-emerald-800',
};

export function StatusBadge({ status }: { status: InvitationStatus }) {
  const { t } = useI18n();
  const label = { DRAFT: t.statusDraft, PAID: t.statusPaid, PUBLISHED: t.statusPublished }[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLE[status]}`}>{label}</span>;
}

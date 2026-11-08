import { LEAD_STATUSES } from '@chakyruu/shared';
import { useCallback, useState } from 'react';
import { api, ApiError } from '../../api/client';
import type { AdminLead, LeadStatus } from '../../api/types';
import { useAsync } from '../../api/useAsync';
import { useI18n } from '../../i18n/LanguageContext';
import { formatDateTime } from '../../lib/format';
import { ErrorView, LoadingView } from '../StatusView';

export function LeadsTab() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<LeadStatus | undefined>('NEW');
  const load = useCallback(() => api.admin.leads(status), [status]);
  const state = useAsync(load);
  const [updated, setUpdated] = useState<Readonly<Record<string, Partial<AdminLead>>>>({});

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView error={state.error} onRetry={state.reload} />;
  const leads = state.data.map((lead) => ({ ...lead, ...updated[lead.id] }));
  const patch = (id: string, change: Partial<AdminLead>) => setUpdated((prev) => ({ ...prev, [id]: { ...prev[id], ...change } }));

  async function markContacted(lead: AdminLead) {
    try {
      patch(lead.id, await api.admin.setLeadStatus(lead.id, 'CONTACTED'));
    } catch {
      window.alert(t.errorGeneric);
    }
  }

  async function convert(lead: AdminLead) {
    if (!window.confirm(t.adminConvertConfirm)) return;
    try {
      const org = await api.admin.convertLead(lead.id);
      patch(lead.id, { status: 'CONVERTED', organizationId: org.id });
    } catch (error: unknown) {
      window.alert(error instanceof ApiError && error.status === 409 ? error.message : t.errorGeneric);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {([undefined, ...LEAD_STATUSES] as const).map((value) => (
          <button
            key={value ?? 'all'}
            type="button"
            aria-pressed={status === value}
            onClick={() => setStatus(value)}
            className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${
              status === value ? 'border-brand bg-brand text-white' : 'border-line bg-white/70 text-brand'
            }`}
          >
            {value ? t.leadStatus[value] : t.adminFilterAll}
          </button>
        ))}
      </div>
      {leads.length === 0 && <p className="text-center text-night/60">{t.adminLeadsEmpty}</p>}
      <ul className="space-y-3">
        {leads.map((lead) => (
          <li key={lead.id} className="rounded-2xl border border-line bg-white/70 p-4">
            <p className="text-xs uppercase tracking-wider text-brand">
              {t.orgType[lead.type]} · {t.leadStatus[lead.status]}
            </p>
            <p className="font-display font-extrabold text-xl text-night">{lead.venueName}</p>
            <p className="text-sm text-night/70">
              {lead.name} ·{' '}
              <a href={`tel:${lead.phone}`} className="underline">
                {lead.phone}
              </a>
              {lead.city ? ` · ${lead.city}` : ''}
            </p>
            <p className="text-xs text-night/50">{formatDateTime(lead.createdAt, locale)}</p>
            {lead.status !== 'CONVERTED' && (
              <div className="mt-3 flex flex-wrap gap-2">
                {lead.status === 'NEW' && (
                  <button type="button" onClick={() => void markContacted(lead)} className="min-h-11 rounded-xl border border-brand/40 px-4 text-sm font-medium text-brand">
                    {t.adminMarkContacted}
                  </button>
                )}
                <button type="button" onClick={() => void convert(lead)} className="min-h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white">
                  {t.adminConvert}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

import { ORG_TYPES } from '@chakyruu/shared';
import { useCallback, useState } from 'react';
import { api } from '../../api/client';
import type { AdminOrganization, OrgType } from '../../api/types';
import { useAsync } from '../../api/useAsync';
import { useI18n } from '../../i18n/LanguageContext';
import { ErrorView, LoadingView } from '../StatusView';

type Props = {
  /** Catalogue moderation tab shows only tamadas. */
  fixedType?: OrgType;
};

export function OrganizationsTab({ fixedType }: Props) {
  const { t } = useI18n();
  const [type, setType] = useState<OrgType | undefined>(fixedType);
  const load = useCallback(() => api.admin.organizations(type), [type]);
  const state = useAsync(load);
  const [overrides, setOverrides] = useState<Readonly<Record<string, Partial<AdminOrganization>>>>({});

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView error={state.error} onRetry={state.reload} />;
  const orgs = state.data.map((org) => ({ ...org, ...overrides[org.id] }));
  const patch = (id: string, change: Partial<AdminOrganization>) => setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...change } }));

  async function toggleCatalog(org: AdminOrganization) {
    const next = org.catalogStatus === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED';
    try {
      await api.admin.setCatalogStatus(org.id, next);
      patch(org.id, { catalogStatus: next });
    } catch {
      window.alert(t.errorGeneric);
    }
  }

  async function grant(org: AdminOrganization) {
    const amount = Number(window.prompt(t.adminGrantPrompt, '10'));
    if (!Number.isInteger(amount) || amount <= 0) return;
    try {
      const { balance } = await api.admin.grantCredits(org.id, amount);
      patch(org.id, { invitationCredits: balance });
    } catch {
      window.alert(t.errorGeneric);
    }
  }

  return (
    <div className="space-y-4">
      {!fixedType && (
        <div className="flex flex-wrap gap-2">
          {([undefined, ...ORG_TYPES] as const).map((value) => (
            <button
              key={value ?? 'all'}
              type="button"
              aria-pressed={type === value}
              onClick={() => setType(value)}
              className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
                type === value ? 'border-burgundy bg-burgundy text-cream' : 'border-gold/50 bg-white/70 text-burgundy'
              }`}
            >
              {value ? t.orgType[value] : t.adminFilterAll}
            </button>
          ))}
        </div>
      )}
      {orgs.length === 0 && <p className="text-center text-ink/60">{t.adminOrgsEmpty}</p>}
      <ul className="space-y-3">
        {orgs.map((org) => (
          <li key={org.id} className="rounded-2xl border border-gold/30 bg-white/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-gold">
                  {t.orgType[org.type]}
                  {org.city ? ` · ${org.city}` : ''}
                </p>
                <p className="truncate font-serif text-xl text-burgundy">{org.name}</p>
                <p className="text-xs text-ink/60">
                  {org.adminPhones.join(', ') || t.adminNoAdmin} · {org.giftsIssued} {t.adminGifts} · {org.invitations} {t.adminInvitations}
                </p>
              </div>
              <span className="shrink-0 rounded-xl bg-burgundy px-2 py-1 text-center text-cream">
                <span className="block font-bold tabular-nums">{org.invitationCredits}</span>
                <span className="block text-[10px]">{t.adminCredits}</span>
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void grant(org)} className="min-h-11 rounded-full border border-burgundy/40 px-4 text-sm font-medium text-burgundy">
                + {t.adminGrant}
              </button>
              {org.type !== 'AGENCY' && (
                <button
                  type="button"
                  onClick={() => void toggleCatalog(org)}
                  className={`min-h-11 rounded-full px-4 text-sm font-medium ${
                    org.catalogStatus === 'PUBLISHED' ? 'border border-stone-300 text-stone-700' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {org.catalogStatus === 'PUBLISHED' ? t.adminHide : t.adminPublish}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

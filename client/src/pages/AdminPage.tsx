import { useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { LeadsTab } from '../components/admin/LeadsTab';
import { OrganizationsTab } from '../components/admin/OrganizationsTab';
import { PricesTab } from '../components/admin/PricesTab';
import { PromoTab } from '../components/admin/PromoTab';
import { StatsTab } from '../components/admin/StatsTab';
import { TemplatesTab } from '../components/admin/TemplatesTab';
import { TracksTab } from '../components/admin/TracksTab';
import { AppHeader } from '../components/AppHeader';
import { useI18n } from '../i18n/LanguageContext';

export type AdminTab = 'stats' | 'leads' | 'orgs' | 'catalog' | 'payments' | 'prices' | 'promo' | 'tracks' | 'templates';

type Props = {
  /** Payments tab (manual confirmation) is plugged in by the payments module. */
  paymentsTab?: ReactNode;
  /** /admin/templates opens straight on that tab. */
  initialTab?: AdminTab;
};

/** Super-admin area. The API enforces the ADMIN role; this check only avoids showing an empty page. */
export function AdminPage({ paymentsTab, initialTab = 'stats' }: Props) {
  const { t } = useI18n();
  const { state } = useAuth();
  const [tab, setTab] = useState<AdminTab>(initialTab);
  const isAdmin = state.status === 'authenticated' && state.user.role === 'ADMIN';

  const tabs: { value: AdminTab; label: string }[] = [
    { value: 'stats', label: t.adminTabStats },
    { value: 'leads', label: t.adminTabLeads },
    { value: 'orgs', label: t.adminTabOrgs },
    { value: 'catalog', label: t.adminTabCatalog },
    ...(paymentsTab ? [{ value: 'payments' as const, label: t.adminTabPayments }] : []),
    { value: 'prices', label: t.adminTabPrices },
    { value: 'promo', label: t.adminTabPromo },
    { value: 'templates', label: t.adminTabTemplates },
    { value: 'tracks', label: t.adminTabTracks },
  ];

  return (
    <div className="min-h-dvh pb-16">
      <AppHeader />
      <main className="mx-auto max-w-4xl space-y-5 px-4 pt-6">
        <h1 className="font-display font-extrabold text-3xl text-night">{t.adminTitle}</h1>
        {!isAdmin ? (
          <p className="text-night/70">{t.noAccess}</p>
        ) : (
          <>
            <div role="tablist" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {tabs.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`min-h-11 shrink-0 rounded-xl border px-4 text-sm font-medium ${
                    tab === value ? 'border-brand bg-brand text-white' : 'border-line bg-white/70 text-brand'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === 'stats' && <StatsTab />}
            {tab === 'leads' && <LeadsTab />}
            {tab === 'orgs' && <OrganizationsTab />}
            {tab === 'catalog' && <OrganizationsTab fixedType="TAMADA" />}
            {tab === 'payments' && paymentsTab}
            {tab === 'prices' && <PricesTab />}
            {tab === 'promo' && <PromoTab />}
            {tab === 'tracks' && <TracksTab />}
            {tab === 'templates' && <TemplatesTab />}
          </>
        )}
      </main>
    </div>
  );
}

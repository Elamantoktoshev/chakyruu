import { useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { LeadsTab } from '../components/admin/LeadsTab';
import { OrganizationsTab } from '../components/admin/OrganizationsTab';
import { PricesTab } from '../components/admin/PricesTab';
import { TracksTab } from '../components/admin/TracksTab';
import { AppHeader } from '../components/AppHeader';
import { useI18n } from '../i18n/LanguageContext';

type Tab = 'leads' | 'orgs' | 'catalog' | 'payments' | 'prices' | 'tracks';

type Props = {
  /** Payments tab (manual confirmation) is plugged in by the payments module. */
  paymentsTab?: ReactNode;
};

/** Super-admin area. The API enforces the ADMIN role; this check only avoids showing an empty page. */
export function AdminPage({ paymentsTab }: Props) {
  const { t } = useI18n();
  const { state } = useAuth();
  const [tab, setTab] = useState<Tab>('leads');
  const isAdmin = state.status === 'authenticated' && state.user.role === 'ADMIN';

  const tabs: { value: Tab; label: string }[] = [
    { value: 'leads', label: t.adminTabLeads },
    { value: 'orgs', label: t.adminTabOrgs },
    { value: 'catalog', label: t.adminTabCatalog },
    ...(paymentsTab ? [{ value: 'payments' as const, label: t.adminTabPayments }] : []),
    { value: 'prices', label: t.adminTabPrices },
    { value: 'tracks', label: t.adminTabTracks },
  ];

  return (
    <div className="min-h-dvh pb-16">
      <AppHeader />
      <main className="mx-auto max-w-4xl space-y-5 px-4 pt-6">
        <h1 className="font-serif text-3xl text-burgundy">{t.adminTitle}</h1>
        {!isAdmin ? (
          <p className="text-ink/70">{t.noAccess}</p>
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
                  className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${
                    tab === value ? 'border-burgundy bg-burgundy text-cream' : 'border-gold/50 bg-white/70 text-burgundy'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === 'leads' && <LeadsTab />}
            {tab === 'orgs' && <OrganizationsTab />}
            {tab === 'catalog' && <OrganizationsTab fixedType="TAMADA" />}
            {tab === 'payments' && paymentsTab}
            {tab === 'prices' && <PricesTab />}
            {tab === 'tracks' && <TracksTab />}
          </>
        )}
      </main>
    </div>
  );
}

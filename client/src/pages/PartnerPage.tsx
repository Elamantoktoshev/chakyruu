import { useCallback, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { PartnerProfile } from '../api/types';
import { useAsync } from '../api/useAsync';
import { AppHeader } from '../components/AppHeader';
import { BuyPackages } from '../components/partner/BuyPackages';
import { CreditsTab } from '../components/partner/CreditsTab';
import { GiftsTab } from '../components/partner/GiftsTab';
import { HallsTab } from '../components/partner/HallsTab';
import { ProfileTab } from '../components/partner/ProfileTab';
import { StatsTab } from '../components/partner/StatsTab';
import { TamadaTab } from '../components/partner/TamadaTab';
import { ErrorView, LoadingView } from '../components/StatusView';
import { useI18n } from '../i18n/LanguageContext';

type Tab = 'gifts' | 'profile' | 'halls' | 'tamada' | 'credits' | 'stats';

export function PartnerPage() {
  const { t } = useI18n();
  const load = useCallback(() => api.partner.profile(), []);
  const state = useAsync(load);

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') {
    const isNotPartner = state.error instanceof ApiError && state.error.status === 403;
    return isNotPartner ? (
      <div className="min-h-dvh">
        <AppHeader />
        <p className="mx-auto max-w-md px-4 py-16 text-center text-night/70">{t.notPartner}</p>
      </div>
    ) : (
      <ErrorView error={state.error} onRetry={state.reload} />
    );
  }
  return <Cabinet initial={state.data} />;
}

function Cabinet({ initial }: { initial: PartnerProfile }) {
  const { t } = useI18n();
  const [profile, setProfile] = useState(initial);
  const [tab, setTab] = useState<Tab>('gifts');
  const tabs: { value: Tab; label: string }[] = [
    { value: 'gifts', label: t.tabGifts },
    { value: 'stats', label: t.tabStats },
    { value: 'credits', label: t.tabCredits },
    { value: 'profile', label: t.tabProfile },
    ...(profile.type === 'VENUE' ? [{ value: 'halls' as const, label: t.tabHalls }] : []),
    ...(profile.type === 'TAMADA' ? [{ value: 'tamada' as const, label: t.tabTamada }] : []),
  ];
  const changeCredits = (delta: number) =>
    setProfile((prev) => ({ ...prev, invitationCredits: prev.invitationCredits + delta }));

  return (
    <div className="min-h-dvh pb-16">
      <AppHeader />
      <main className="mx-auto max-w-3xl space-y-5 px-4 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-brand">
              {t.partnerTitle} · {t.orgType[profile.type]}
            </p>
            <h1 className="font-display font-extrabold text-3xl text-night">{profile.name}</h1>
          </div>
          <span className="rounded-2xl bg-brand px-3 py-2 text-center text-white">
            <span className="block font-display text-2xl font-bold tabular-nums">{profile.invitationCredits}</span>
            <span className="block text-[10px]">{t.tabCredits}</span>
          </span>
        </div>

        <div role="tablist" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {tabs.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${
                tab === value ? 'border-brand bg-brand text-white' : 'border-line bg-white/70 text-brand'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'gifts' && <GiftsTab halls={profile.halls} onCreditsChange={changeCredits} />}
        {tab === 'stats' && <StatsTab type={profile.type} />}
        {tab === 'credits' && (
          <CreditsTab balance={profile.invitationCredits}>
            <BuyPackages type={profile.type} />
          </CreditsTab>
        )}
        {tab === 'profile' && <ProfileTab profile={profile} onChange={setProfile} />}
        {tab === 'halls' && <HallsTab halls={profile.halls} onChange={(halls) => setProfile((prev) => ({ ...prev, halls }))} />}
        {tab === 'tamada' && <TamadaTab profile={profile} onChange={setProfile} />}
      </main>
    </div>
  );
}

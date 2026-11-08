import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '../api/client';
import type { OwnerInvitation, Template } from '../api/types';
import { useAsync } from '../api/useAsync';
import { BuilderForm, type BuilderChange } from '../builder/BuilderForm';
import { previewPartnerBlocks, type PartnerOptions } from '../builder/PartnerPicker';
import { useAutosave, type SaveStatus } from '../builder/useAutosave';
import { AppHeader } from '../components/AppHeader';
import { InvitationView } from '../components/invitation/InvitationView';
import { PhoneFrame } from '../components/PhoneFrame';
import { ErrorView, LoadingView } from '../components/StatusView';
import type { Dict } from '../i18n/dict';
import { useI18n } from '../i18n/LanguageContext';

interface BuilderData {
  invitation: OwnerInvitation;
  templates: Template[];
  partners: PartnerOptions;
}

export function BuilderPage() {
  const { id = '' } = useParams();
  const load = useCallback(
    async (): Promise<BuilderData> => {
      const [invitation, templates, venues, tamadas] = await Promise.all([
        api.getMyInvitation(id),
        api.listTemplates(),
        api.listVenues(),
        api.listTamadas({}),
      ]);
      return { invitation, templates, partners: { venues, tamadas } };
    },
    [id],
  );
  const state = useAsync(load);

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView error={state.error} onRetry={state.reload} />;
  return <Builder key={id} {...state.data} />;
}

type Tab = 'form' | 'preview';

function Builder({ invitation: initial, templates, partners }: BuilderData) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(initial);
  const [tab, setTab] = useState<Tab>('form');
  // Remounting the preview replays the opening animation.
  const [replayKey, setReplayKey] = useState(0);

  const autosave = useAutosave({
    save: (patch) => api.updateInvitation(initial.id, patch),
    // Only server-derived fields are taken from the response, so typing during a save is never overwritten.
    onSaved: (saved) => setInvitation((prev) => ({ ...prev, slug: saved.slug, status: saved.status })),
  });

  function handleChange({ patch, view }: BuilderChange) {
    setInvitation((prev) => ({ ...prev, ...view }));
    if (patch) autosave.enqueue(patch);
  }

  async function handlePublish() {
    await autosave.flush();
    navigate(`/pay/${invitation.id}`);
  }

  const isPublished = invitation.status === 'PUBLISHED';
  const preview = (
    <div className="space-y-3">
      <PhoneFrame>
        <InvitationView
          key={`${replayKey}-${invitation.openingAnimation}`}
          invitation={{ ...invitation, ...previewPartnerBlocks(invitation, partners) }}
          lang={invitation.language}
          mode="preview"
          opening={{ doorLabel: invitation.hostNames || '…' }}
        />
      </PhoneFrame>
      {invitation.openingAnimation !== 'NONE' && (
        <button
          type="button"
          onClick={() => setReplayKey((n) => n + 1)}
          className="mx-auto flex min-h-11 items-center rounded-xl border border-brand/40 px-5 text-sm font-medium text-brand"
        >
          ↻ {t.replayOpening}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh pb-28 lg:pb-10">
      <AppHeader />
      <div className="sticky top-14 z-20 grid grid-cols-2 border-b border-line bg-page/95 lg:hidden" role="tablist">
        {(['form', 'preview'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`min-h-12 text-sm font-semibold ${tab === value ? 'border-b-2 border-brand text-brand' : 'text-night/60'}`}
          >
            {value === 'form' ? t.tabForm : t.tabPreview}
          </button>
        ))}
      </div>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 pt-6 lg:grid-cols-[1fr_24rem]">
        <section className={tab === 'form' ? '' : 'hidden lg:block'}>
          <h1 className="font-display font-extrabold text-3xl text-night">{t.builderTitle}</h1>
          <SlugHint slug={invitation.slug} t={t} />
          {invitation.isGift && invitation.giftFrom && (
            <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              🎁 {t.giftBuilderBanner.replace('{org}', invitation.giftFrom.name)}
            </p>
          )}
          <div className="mt-6">
            <BuilderForm
              invitation={invitation}
              templates={templates}
              partners={partners}
              onChange={handleChange}
              beforeUpload={autosave.flush}
            />
          </div>
        </section>
        <aside className={`${tab === 'preview' ? '' : 'hidden'} lg:sticky lg:top-20 lg:block lg:self-start`}>{preview}</aside>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-page/95 px-4 py-3 backdrop-blur lg:static lg:mx-auto lg:mt-8 lg:max-w-6xl lg:border-0 lg:bg-transparent">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <SaveIndicator status={autosave.status} t={t} />
          {isPublished ? (
            <Link to={`/${invitation.slug}`} className="min-h-12 rounded-xl bg-brand px-6 py-3 font-semibold text-white">
              {t.openInvitation}
            </Link>
          ) : (
            <div className="text-right">
              <button
                type="button"
                onClick={() => void handlePublish()}
                className="min-h-12 rounded-xl bg-brand px-7 font-semibold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-dark"
              >
                {invitation.isGift ? t.publishFree : t.publish}
              </button>
              <p className="mt-1 hidden text-xs text-night/55 sm:block">{t.publishHint}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SlugHint({ slug, t }: { slug: string; t: Dict }) {
  const isPlaceholder = slug.startsWith('draft-');
  return (
    <p className="mt-2 text-sm text-night/65">
      {t.yourLink}:{' '}
      {isPlaceholder ? (
        <span className="italic">{t.linkAfterNames}</span>
      ) : (
        <span className="break-all font-medium text-brand">
          {window.location.host}/{slug}
        </span>
      )}
    </p>
  );
}

const STATUS_STYLE: Record<SaveStatus, string> = {
  idle: 'text-night/40',
  dirty: 'text-night/50',
  saving: 'text-night/60',
  saved: 'text-emerald-700',
  error: 'text-red-700',
};

function SaveIndicator({ status, t }: { status: SaveStatus; t: Dict }) {
  const label = { idle: '', dirty: t.unsavedWarning, saving: t.saving, saved: t.saved, error: t.saveFailed }[status];
  return (
    <p aria-live="polite" className={`text-sm ${STATUS_STYLE[status]}`}>
      {label}
    </p>
  );
}

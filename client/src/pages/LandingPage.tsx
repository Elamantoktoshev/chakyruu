import { EVENT_TYPES, PUBLISH_PRICE_TYIYN, tyiynToSom } from '@chakyruu/shared';
import { useCallback } from 'react';
import { Link } from 'react-router';
import { api } from '../api/client';
import type { Template } from '../api/types';
import { useAsync } from '../api/useAsync';
import { useAuth } from '../auth/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { InvitationView } from '../components/invitation/InvitationView';
import { PartnerForm } from '../components/landing/PartnerForm';
import { OrnamentBand, OrnamentDivider } from '../components/Ornament';
import { PaymentBadges } from '../components/PaymentBadges';
import { PhoneFrame } from '../components/PhoneFrame';
import { TemplateCard, sampleInvitation } from '../components/TemplateCard';
import { useI18n } from '../i18n/LanguageContext';

const DEMO_SLUG = 'aibek-aizada';

/** One template per event type, in catalogue order. */
function onePerType(templates: readonly Template[]): Template[] {
  return EVENT_TYPES.flatMap((type) => templates.find((template) => template.type === type) ?? []);
}

export function LandingPage() {
  const { t, lang } = useI18n();
  const { state: auth } = useAuth();
  const load = useCallback(() => api.listTemplates(), []);
  const templates = useAsync(load);
  const examples = templates.status === 'success' ? onePerType(templates.data) : [];
  const createHref = auth.status === 'authenticated' ? '/create' : '/login?next=/create';
  const price = String(tyiynToSom(PUBLISH_PRICE_TYIYN));

  return (
    <div className="min-h-dvh">
      <AppHeader />

      {/* Hero: CTA and price are visible on the first screen of a phone. */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-8 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">{t.heroEyebrow}</p>
          <h1 className="mt-3 font-serif text-4xl font-bold leading-tight text-burgundy sm:text-6xl">{t.heroTitle}</h1>
          <p className="mt-4 max-w-xl text-lg text-ink/75">{t.heroSubtitle}</p>

          <div className="mt-6 inline-flex flex-col rounded-2xl border-2 border-gold/60 bg-white/70 px-5 py-3">
            <span className="font-serif text-xl font-semibold text-burgundy">{t.priceLine.replace('{price}', price)}</span>
            <span className="text-xs text-ink/60">{t.priceNote}</span>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              to={createHref}
              className="flex min-h-14 items-center justify-center rounded-full bg-burgundy px-8 text-lg font-semibold text-cream shadow-lg shadow-burgundy/25 transition hover:bg-burgundy-dark"
            >
              {t.heroCta}
            </Link>
            <Link
              to={`/${DEMO_SLUG}`}
              className="flex min-h-14 items-center justify-center rounded-full border-2 border-burgundy px-8 font-semibold text-burgundy"
            >
              {t.heroDemo}
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-sm text-ink/60">{t.payWith}</span>
            <PaymentBadges />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rotate-3 rounded-[3rem] bg-gold/15" aria-hidden="true" />
          {examples[0] && (
            <PhoneFrame className="-rotate-2">
              <InvitationView invitation={sampleInvitation(examples[0], lang)} lang={lang} mode="preview" />
            </PhoneFrame>
          )}
        </div>
      </section>

      <div className="bg-burgundy py-1">
        <OrnamentBand />
      </div>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center font-serif text-3xl text-burgundy">{t.benefitsTitle}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              [t.benefitPriceTitle, t.benefitPriceText],
              [t.benefitLangTitle, t.benefitLangText],
              [t.benefitLinkTitle, t.benefitLinkText],
              [t.benefitControlTitle, t.benefitControlText],
            ] as const
          ).map(([title, text]) => (
            <div key={title} className="rounded-3xl border border-gold/40 bg-white/70 p-5">
              <h3 className="font-serif text-xl text-burgundy">{title}</h3>
              <p className="mt-2 text-sm text-ink/70">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white/50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-serif text-3xl text-burgundy">{t.stepsTitle}</h2>
          <OrnamentDivider className="mx-auto mt-4 max-w-xs" />
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {(
              [
                [t.step1Title, t.step1Text],
                [t.step2Title, t.step2Text],
                [t.step3Title, t.step3Text],
              ] as const
            ).map(([title, text], index) => (
              <li key={title} className="text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-burgundy font-serif text-2xl text-cream">
                  {index + 1}
                </span>
                <h3 className="mt-3 font-serif text-2xl text-burgundy">{title}</h3>
                <p className="mt-1 text-ink/70">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {examples.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-serif text-3xl text-burgundy">{t.templatesTitle}</h2>
            <Link to={createHref} className="text-sm font-semibold text-burgundy underline underline-offset-4">
              {t.templatesAll}
            </Link>
          </div>
          <div className="-mx-4 mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            {examples.map((template) => (
              <div key={template.id} className="w-72 shrink-0 snap-start">
                <TemplateCard template={template} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="partners" className="bg-burgundy py-14 text-cream">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-2">
          <div>
            <h2 className="font-serif text-3xl">{t.partnersTitle}</h2>
            <p className="mt-3 text-cream/80">{t.partnersText}</p>
          </div>
          <PartnerForm />
        </div>
      </section>

      <footer className="bg-burgundy-dark py-6 text-center text-xs text-cream/60">{t.footer}</footer>
    </div>
  );
}

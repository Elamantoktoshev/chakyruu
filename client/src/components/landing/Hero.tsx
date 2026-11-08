import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { InvitationView } from '../invitation/InvitationView';
import { PaymentBadges } from '../PaymentBadges';
import { PhoneFrame } from '../PhoneFrame';
import { primaryButton, secondaryButton } from '../ui/buttons';
import { OyuPattern } from '../ui/OyuPattern';
import { ArrowRightIcon, CheckCircleIcon, NoteIcon, PinIcon, PlayIcon } from '../ui/SiteIcons';
import { useI18n } from '../../i18n/LanguageContext';
import { heroInvitation } from './demoInvitation';

type Props = { createHref: string; publishPriceSom: number | null };

type ChipProps = { icon: ReactNode; text: string; tone: string; className: string; delay: string };

/** Small floating card next to the phone: what the guest and the host actually get. */
function FloatingChip({ icon, text, tone, className, delay }: ChipProps) {
  return (
    <div
      className={`animate-float absolute z-10 hidden items-center gap-2.5 rounded-2xl border border-white/70 bg-white/90 py-2.5 pl-2.5 pr-4 text-sm font-semibold text-night shadow-xl shadow-night/10 backdrop-blur sm:flex ${className}`}
      style={{ animationDelay: delay }}
      aria-hidden="true"
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
      {text}
    </div>
  );
}

/** First screen: promise, free CTA, facts, payment methods and a live invitation opening on its own. */
export function Hero({ createHref, publishPriceSom }: Props) {
  const { t, lang } = useI18n();
  const price = publishPriceSom === null ? '…' : publishPriceSom.toLocaleString('ru-RU');
  // "Тойго чакыруу — 5 мүнөттө даяр": the part after the dash is highlighted.
  const [titleLead = '', titleAccent = ''] = t.heroTitle.split('—').map((part) => part.trim());

  return (
    <section className="brand-glow relative overflow-hidden">
      <OyuPattern className="pointer-events-none absolute inset-0 h-full w-full text-brand opacity-[0.09]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr] lg:pb-28 lg:pt-16">
        <div className="animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-white px-3.5 py-1.5 text-xs font-bold text-brand shadow-sm">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            {t.heroBadge}
          </p>

          <h1 className="mt-6 font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-night sm:text-6xl">
            {titleLead}
            {titleAccent && (
              <span className="relative mt-1 block w-fit text-brand">
                {titleAccent}
                <svg viewBox="0 0 300 16" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-brand/30" aria-hidden="true">
                  <path d="M3 11 C 70 3, 150 3, 297 9" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>
            )}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{t.heroSubtitle}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to={createHref} className={`group ${primaryButton} min-h-14 text-lg`}>
              {t.heroCta}
              <ArrowRightIcon className="h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
            <Link to="/aibek-aizada" className={`${secondaryButton} min-h-14`}>
              <PlayIcon className="h-5 w-5 text-brand" />
              {t.heroDemo}
            </Link>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-white/80 py-4 shadow-sm backdrop-blur">
            {t.heroStats.map(([value, label]) => (
              <div key={label} className="px-2 text-center sm:px-4">
                <dt className="sr-only">{label}</dt>
                <dd className="whitespace-nowrap font-display text-lg font-extrabold text-brand sm:text-2xl">{value.replace('{price}', price)}</dd>
                <dd className="mt-0.5 text-xs leading-snug text-muted">{label}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted">{t.payWith}</span>
            <PaymentBadges />
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[21rem]">
          <div className="absolute -inset-10 -z-10 rounded-full bg-gradient-to-br from-brand/20 via-lilac/10 to-sky/15 blur-3xl" aria-hidden="true" />
          <FloatingChip
            icon={<CheckCircleIcon className="h-5 w-5" />}
            text={t.heroChipRsvp}
            tone="bg-mint-soft text-mint"
            className="-left-28 top-16"
            delay="0s"
          />
          <FloatingChip icon={<NoteIcon className="h-5 w-5" />} text={t.heroChipMusic} tone="bg-lilac-soft text-lilac" className="-right-28 top-[58%]" delay="1.2s" />
          <FloatingChip icon={<PinIcon className="h-5 w-5" />} text={t.heroChipMap} tone="bg-sky-soft text-sky" className="-left-24 bottom-10" delay="2.4s" />
          <PhoneFrame className="rotate-0 lg:rotate-2">
            <InvitationView
              invitation={heroInvitation(lang)}
              lang={lang}
              mode="preview"
              opening={{ doorLabel: lang === 'KY' ? 'Урматтуу Асан байке' : 'Уважаемый Асан', isLooping: true }}
            />
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}

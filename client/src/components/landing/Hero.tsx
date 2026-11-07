import { Link } from 'react-router';
import { InvitationView } from '../invitation/InvitationView';
import { OyuMedallion } from '../art/Patterns';
import { PaymentBadges } from '../PaymentBadges';
import { PhoneFrame } from '../PhoneFrame';
import { useI18n } from '../../i18n/LanguageContext';
import { heroInvitation } from './demoInvitation';

type Props = { createHref: string; publishPriceSom: number | null };

/** First screen: promise, free CTA, the price, payment methods and a live invitation opening on its own. */
export function Hero({ createHref, publishPriceSom }: Props) {
  const { t, lang } = useI18n();
  const price = publishPriceSom === null ? '…' : publishPriceSom.toLocaleString('ru-RU');
  // "Тойго заманбап чакыруу — 5 мүнөттө": the part after the dash is set in burgundy italics.
  const [titleLead = '', titleAccent = ''] = t.heroTitle.split('—').map((part) => part.trim());

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-40 -top-24 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,var(--color-gold-light)_0%,transparent_65%)] opacity-50" aria-hidden="true" />
      <OyuMedallion className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 text-gold opacity-[0.08]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 lg:grid-cols-[1.15fr_1fr] lg:pb-24 lg:pt-16">
        <div className="animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />
            {t.heroEyebrow}
          </p>
          <h1 className="mt-5 font-serif text-[2.6rem] font-bold leading-[1.08] text-graphite sm:text-6xl lg:text-7xl">
            {titleLead}
            {titleAccent && <span className="block italic text-burgundy">— {titleAccent}</span>}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink/75">{t.heroSubtitle}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to={createHref}
              className="group flex min-h-14 items-center justify-center gap-2 rounded-full bg-burgundy px-9 text-lg font-semibold text-cream shadow-xl shadow-burgundy/25 transition hover:-translate-y-0.5 hover:bg-burgundy-dark"
            >
              {t.heroCta}
              <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
            </Link>
            <Link
              to="/aibek-aizada"
              className="flex min-h-14 items-center justify-center rounded-full border-2 border-graphite/80 px-8 font-semibold text-graphite transition hover:bg-graphite hover:text-cream"
            >
              {t.heroDemo}
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            <p className="font-serif text-lg text-burgundy">
              {t.priceLine.replace('{price}', price)}
              <span className="mt-0.5 block font-sans text-xs text-ink/55">{t.priceNote}</span>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-ink/55">{t.payWith}</span>
              <PaymentBadges />
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[22rem]">
          <div className="absolute -inset-8 -z-10 rotate-6 rounded-[3.5rem] bg-gradient-to-br from-gold/30 via-transparent to-burgundy/20" aria-hidden="true" />
          <PhoneFrame className="lg:-rotate-2">
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

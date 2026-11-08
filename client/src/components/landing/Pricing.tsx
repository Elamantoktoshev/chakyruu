import { Link } from 'react-router';
import type { PublicPrice } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';
import { Reveal } from '../Reveal';
import { eyebrow, primaryButton, sectionTitle } from '../ui/buttons';
import { CheckCircleIcon } from '../ui/SiteIcons';

type Props = { prices: readonly PublicPrice[]; createHref: string; publishPriceSom: number | null };

const som = (amount: number) => `${amount.toLocaleString('ru-RU')} сом`;

/** Tariffs straight from the Price table (editable in /admin). */
export function Pricing({ prices, createHref, publishPriceSom }: Props) {
  const { t } = useI18n();
  const packages = (audience: 'VENUE' | 'TAMADA') => prices.filter((price) => price.audience === audience && price.credits);

  return (
    <section id="prices" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 lg:py-24">
      <Reveal className="text-center">
        <p className={eyebrow}>{t.navPrices}</p>
        <h2 className={`mt-4 ${sectionTitle}`}>{t.pricingTitle}</h2>
      </Reveal>
      <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Reveal className="relative overflow-hidden rounded-[2rem] border-2 border-brand bg-white p-8 shadow-2xl shadow-brand/10">
          <span className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand-soft" aria-hidden="true" />
          <p className="relative font-display text-sm font-bold uppercase tracking-wider text-brand">{t.pricingClientTitle}</p>
          <div className="relative mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-lemon-soft p-5">
              <p className="text-sm text-muted">{t.pricingClientFree}</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-night sm:text-3xl">{t.pricingClientFreePrice}</p>
            </div>
            <div className="rounded-2xl bg-brand p-5 text-white shadow-lg shadow-brand/30">
              <p className="text-sm text-white/80">{t.pricingClientPublish}</p>
              <p className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">{publishPriceSom === null ? '…' : som(publishPriceSom)}</p>
            </div>
          </div>
          <ul className="relative mt-7 space-y-3 text-night/80">
            {t.pricingClientFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                {feature}
              </li>
            ))}
          </ul>
          <Link to={createHref} className={`relative mt-8 w-full ${primaryButton} min-h-14`}>
            {t.heroCta}
          </Link>
        </Reveal>

        <Reveal className="rounded-[2rem] bg-night p-8 text-white" delayMs={120}>
          <p className="font-display text-sm font-bold uppercase tracking-wider text-lemon">{t.pricingPartnerTitle}</p>
          <p className="mt-3 text-white/70">{t.pricingPartnerText}</p>
          {(['VENUE', 'TAMADA'] as const).map((audience) => (
            <div key={audience} className="mt-6">
              <p className="text-sm font-bold text-white/90">{audience === 'VENUE' ? t.pricingForVenue : t.pricingForTamada}</p>
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {packages(audience).map((price) => (
                  <li key={price.code} className="rounded-2xl bg-white/[0.07] p-3 text-center ring-1 ring-white/10">
                    <p className="text-xs text-white/60">{t.pricingPackage.replace('{n}', String(price.credits))}</p>
                    <p className="mt-1 font-display font-bold">{som(price.amountSom)}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <a href="#partners" className="mt-7 flex min-h-12 items-center justify-center rounded-2xl bg-white font-display font-bold text-night transition hover:bg-lemon">
            {t.partnerSubmit}
          </a>
        </Reveal>
      </div>
    </section>
  );
}

import { Link } from 'react-router';
import type { PublicPrice } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';
import { Reveal } from '../Reveal';

type Props = { prices: readonly PublicPrice[]; createHref: string; publishPriceSom: number | null };

const som = (amount: number) => `${amount.toLocaleString('ru-RU')} сом`;

/** Tariffs straight from the Price table (editable in /admin). */
export function Pricing({ prices, createHref, publishPriceSom }: Props) {
  const { t } = useI18n();
  const packages = (audience: 'VENUE' | 'TAMADA') => prices.filter((price) => price.audience === audience && price.credits);

  return (
    <section id="prices" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
      <Reveal>
        <h2 className="font-serif text-4xl text-graphite sm:text-5xl">{t.pricingTitle}</h2>
      </Reveal>
      <div className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Reveal className="rounded-[2rem] border-2 border-burgundy bg-white p-7 shadow-xl shadow-burgundy/10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">{t.pricingClientTitle}</p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-cream p-4">
              <p className="text-sm text-ink/60">{t.pricingClientFree}</p>
              <p className="mt-1 font-serif text-3xl font-bold text-graphite">{t.pricingClientFreePrice}</p>
            </div>
            <div className="rounded-2xl bg-burgundy p-4 text-cream">
              <p className="text-sm text-cream/75">{t.pricingClientPublish}</p>
              <p className="mt-1 font-serif text-3xl font-bold">{publishPriceSom === null ? '…' : som(publishPriceSom)}</p>
            </div>
          </div>
          <ul className="mt-6 space-y-2 text-ink/75">
            {t.pricingClientFeatures.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="text-gold" aria-hidden="true">✦</span>
                {feature}
              </li>
            ))}
          </ul>
          <Link to={createHref} className="mt-7 flex min-h-14 items-center justify-center rounded-full bg-burgundy font-semibold text-cream">
            {t.heroCta}
          </Link>
        </Reveal>

        <Reveal className="rounded-[2rem] bg-graphite p-7 text-cream" delayMs={120}>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">{t.pricingPartnerTitle}</p>
          <p className="mt-3 text-cream/75">{t.pricingPartnerText}</p>
          {(['VENUE', 'TAMADA'] as const).map((audience) => (
            <div key={audience} className="mt-5">
              <p className="text-sm font-semibold text-gold-light">{audience === 'VENUE' ? t.pricingForVenue : t.pricingForTamada}</p>
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {packages(audience).map((price) => (
                  <li key={price.code} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                    <p className="text-xs text-cream/60">{t.pricingPackage.replace('{n}', String(price.credits))}</p>
                    <p className="mt-1 font-semibold">{som(price.amountSom)}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <a href="#partners" className="mt-6 flex min-h-12 items-center justify-center rounded-full border border-gold/60 font-semibold text-gold-light">
            {t.partnerSubmit}
          </a>
        </Reveal>
      </div>
    </section>
  );
}

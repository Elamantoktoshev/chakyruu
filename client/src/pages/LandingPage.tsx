import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { usePrices } from '../api/usePrices';
import { useAsync } from '../api/useAsync';
import { useAuth } from '../auth/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { Benefits } from '../components/landing/Benefits';
import { DemoBlock } from '../components/landing/DemoBlock';
import { Faq } from '../components/landing/Faq';
import { Hero } from '../components/landing/Hero';
import { MobileCta } from '../components/landing/MobileCta';
import { PartnerForm } from '../components/landing/PartnerForm';
import { Pricing } from '../components/landing/Pricing';
import { SiteFooter } from '../components/landing/SiteFooter';
import { Steps } from '../components/landing/Steps';
import { TemplateCarousel } from '../components/landing/TemplateCarousel';
import { Reveal } from '../components/Reveal';
import { useI18n } from '../i18n/LanguageContext';

/** Shows the floating mobile CTA once the hero has scrolled out of view. */
function useScrolledPast<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [isPast, setIsPast] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setIsPast(entry ? !entry.isIntersecting : false));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, isPast];
}

export function LandingPage() {
  const { t } = useI18n();
  const { state: auth } = useAuth();
  const { prices, publishPriceSom } = usePrices();
  const load = useCallback(() => api.listTemplates(), []);
  const templates = useAsync(load);
  const [heroRef, isPastHero] = useScrolledPast<HTMLDivElement>();

  const isLoggedIn = auth.status === 'authenticated';
  const createHref = isLoggedIn ? '/create' : '/login?next=/create';
  const templateHref = (templateId: string) => {
    const target = `/create?template=${encodeURIComponent(templateId)}`;
    return isLoggedIn ? target : `/login?next=${encodeURIComponent(target)}`;
  };

  return (
    <div className="min-h-dvh bg-cream">
      <AppHeader />
      <div ref={heroRef}>
        <Hero createHref={createHref} publishPriceSom={publishPriceSom} />
      </div>
      <Benefits />
      <Steps />
      {templates.status === 'success' && <TemplateCarousel templates={templates.data} createHref={templateHref} />}
      <DemoBlock />
      <Pricing prices={prices} createHref={createHref} publishPriceSom={publishPriceSom} />

      <section id="partners" className="scroll-mt-20 bg-burgundy py-20 text-cream">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-serif text-4xl sm:text-5xl">{t.partnersTitle}</h2>
            <p className="mt-4 text-lg text-cream/80">{t.partnersText}</p>
          </Reveal>
          <PartnerForm />
        </div>
      </section>

      <Faq />
      <SiteFooter />
      <MobileCta href={createHref} isVisible={isPastHero} />
    </div>
  );
}

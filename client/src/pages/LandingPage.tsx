import type { EventType } from '@chakyruu/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { usePrices } from '../api/usePrices';
import { useAsync } from '../api/useAsync';
import { useAuth } from '../auth/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { Benefits } from '../components/landing/Benefits';
import { CategoryGrid } from '../components/landing/CategoryGrid';
import { CtaBand } from '../components/landing/CtaBand';
import { DemoBlock } from '../components/landing/DemoBlock';
import { Faq } from '../components/landing/Faq';
import { Hero } from '../components/landing/Hero';
import { Marquee } from '../components/landing/Marquee';
import { MobileCta } from '../components/landing/MobileCta';
import { PartnerForm } from '../components/landing/PartnerForm';
import { Pricing } from '../components/landing/Pricing';
import { SiteFooter } from '../components/landing/SiteFooter';
import { Steps } from '../components/landing/Steps';
import { TemplateCatalog, type CatalogFilter } from '../components/landing/TemplateCatalog';
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
  const [filter, setFilter] = useState<CatalogFilter>('ALL');

  const isLoggedIn = auth.status === 'authenticated';
  const createHref = isLoggedIn ? '/create' : '/login?next=/create';
  const templateHref = (templateId: string) => {
    const target = `/create?template=${encodeURIComponent(templateId)}`;
    return isLoggedIn ? target : `/login?next=${encodeURIComponent(target)}`;
  };
  const showCategory = (type: EventType) => {
    setFilter(type);
    document.getElementById('templates')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-dvh bg-white font-sans text-night">
      <AppHeader />
      <div ref={heroRef}>
        <Hero createHref={createHref} publishPriceSom={publishPriceSom} />
      </div>
      <Marquee />
      <Benefits />
      <CtaBand createHref={createHref} />
      <Steps />
      {templates.status === 'success' && (
        <>
          <CategoryGrid templates={templates.data} onSelect={showCategory} />
          <TemplateCatalog templates={templates.data} filter={filter} onFilterChange={setFilter} templateHref={templateHref} />
        </>
      )}
      <DemoBlock />
      <Pricing prices={prices} createHref={createHref} publishPriceSom={publishPriceSom} />

      <section id="partners" className="scroll-mt-20 px-5 py-6">
        <div className="relative mx-auto grid max-w-6xl gap-10 overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand to-brand-dark px-7 py-14 text-white sm:px-12 lg:grid-cols-2">
          <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <Reveal className="relative">
            <h2 className="font-display text-3xl font-extrabold sm:text-4xl">{t.partnersTitle}</h2>
            <p className="mt-4 text-lg text-white/85">{t.partnersText}</p>
          </Reveal>
          <div className="relative">
            <PartnerForm />
          </div>
        </div>
      </section>

      <Faq />
      <SiteFooter />
      <MobileCta href={createHref} isVisible={isPastHero} />
    </div>
  );
}

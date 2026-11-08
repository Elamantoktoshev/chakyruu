import { useI18n } from '../../i18n/LanguageContext';

type Props = {
  slug: string;
  /** Changes when the invitation is edited, so the browser fetches the new picture. */
  version: string;
};

const linkClass = 'flex min-h-12 flex-1 items-center justify-center rounded-xl border-2 border-brand px-4 text-sm font-semibold';

/** Downloads for spreading the word: a Stories picture with a QR code, and the QR alone for print. */
export function PromoKit({ slug, version }: Props) {
  const { t } = useI18n();
  const base = `/api/og/${encodeURIComponent(slug)}`;
  const cacheKey = `?v=${encodeURIComponent(version)}`;
  const storyUrl = `${base}/story.png${cacheKey}`;
  const qrUrl = `${base}/qr.png${cacheKey}`;

  return (
    <section className="rounded-2xl border border-line bg-white/70 p-4">
      <h2 className="text-sm font-semibold text-night">{t.promoTitle}</h2>
      <div className="mt-3 flex gap-4">
        <img
          src={storyUrl}
          alt={t.promoStoryAlt}
          width={1080}
          height={1920}
          loading="lazy"
          className="h-40 w-auto shrink-0 rounded-xl bg-brand/10 shadow"
        />
        <div className="flex min-w-0 flex-col justify-between gap-3">
          <p className="text-xs leading-relaxed text-night/60">{t.promoHint}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a href={storyUrl} download={`${slug}-stories.png`} className={`${linkClass} bg-brand text-white`}>
              {t.promoStory}
            </a>
            <a href={qrUrl} download={`${slug}-qr.png`} className={`${linkClass} text-brand`}>
              {t.promoQr}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

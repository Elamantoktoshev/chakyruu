import { useEffect, useRef, useState } from 'react';
import type { GalleryPhoto } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';
import { safeUrl } from '../../lib/format';

type Props = {
  photos: readonly GalleryPhoto[];
  /** Section label style of the template. */
  labelClassName: string;
};

/**
 * Swipeable photo strip. Native scroll-snap does the swiping (smooth on any phone, no JS
 * animation); the dots follow the scroll position. Images load lazily, sized to avoid layout shift.
 */
export function Gallery({ photos, labelClassName }: Props) {
  const { t } = useI18n();
  const stripRef = useRef<HTMLUListElement>(null);
  const frameRef = useRef(0);
  const [active, setActive] = useState(0);
  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);
  const visible = photos.filter((photo) => safeUrl(photo.url));
  if (visible.length === 0) return null;

  function slideWidth(strip: HTMLUListElement): number {
    const first = strip.firstElementChild as HTMLElement | null;
    return first ? first.offsetWidth + parseFloat(getComputedStyle(strip).columnGap || '0') : strip.clientWidth;
  }

  function handleScroll() {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const strip = stripRef.current;
      if (strip) setActive(Math.min(visible.length - 1, Math.round(strip.scrollLeft / slideWidth(strip))));
    });
  }

  function goTo(index: number) {
    const strip = stripRef.current;
    if (!strip) return;
    const target = Math.max(0, Math.min(visible.length - 1, index));
    strip.scrollTo({ left: target * slideWidth(strip), behavior: 'smooth' });
  }

  const hasMany = visible.length > 1;

  return (
    <div className="py-10" aria-roledescription="carousel" aria-label={t.galleryTitle}>
      <p className={`px-6 text-center ${labelClassName}`}>{t.galleryTitle}</p>
      <div className="relative mt-6">
        <ul
          ref={stripRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-[7.5%] pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {visible.map((photo, index) => (
            <li
              key={photo.id}
              aria-roledescription="slide"
              aria-label={t.gallerySlide.replace('{n}', String(index + 1)).replace('{total}', String(visible.length))}
              className={`shrink-0 snap-center ${hasMany ? 'w-[85%]' : 'w-full'}`}
            >
              <img
                src={safeUrl(photo.url)}
                width={photo.width}
                height={photo.height}
                loading="lazy"
                decoding="async"
                alt=""
                className="aspect-[4/5] w-full rounded-3xl bg-gold/10 object-cover shadow-lg shadow-burgundy/10"
              />
            </li>
          ))}
        </ul>
        {hasMany && (
          <>
            <ArrowButton direction="prev" label={t.galleryPrev} isDisabled={active === 0} onClick={() => goTo(active - 1)} />
            <ArrowButton direction="next" label={t.galleryNext} isDisabled={active === visible.length - 1} onClick={() => goTo(active + 1)} />
          </>
        )}
      </div>
      {hasMany && (
        <div className="mt-4 flex justify-center gap-2" aria-hidden="true">
          {visible.map((photo, index) => (
            <span key={photo.id} className={`h-1.5 rounded-full transition-all ${index === active ? 'w-5 bg-burgundy' : 'w-1.5 bg-gold/50'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

type ArrowProps = { direction: 'prev' | 'next'; label: string; isDisabled: boolean; onClick: () => void };

/** Desktop helpers; on phones people swipe. */
function ArrowButton({ direction, label, isDisabled, onClick }: ArrowProps) {
  const side = direction === 'prev' ? 'left-2' : 'right-2';
  return (
    <button
      type="button"
      aria-label={label}
      disabled={isDisabled}
      onClick={onClick}
      className={`absolute top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream/90 text-burgundy shadow transition hover:bg-cream disabled:opacity-0 sm:flex ${side}`}
    >
      <span aria-hidden="true">{direction === 'prev' ? '‹' : '›'}</span>
    </button>
  );
}

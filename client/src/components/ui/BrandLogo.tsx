type Props = { className?: string };

/** The түндүк (yurt crown) tile on its own: login page, empty states. */
export function BrandMark({ className = 'h-9 w-9' }: Props) {
  return (
    <svg viewBox="0 0 40 40" className={`block shrink-0 rounded-[30%] ${className}`} aria-hidden="true">
        <defs>
          <linearGradient id="brand-logo-tile" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2cc68f" />
            <stop offset="1" stopColor="var(--color-brand-dark)" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="12" fill="url(#brand-logo-tile)" />
        <circle cx="20" cy="20" r="11" fill="none" stroke="#fff" strokeWidth="2.4" />
        <path d="M10.5 15.5 Q20 21 29.5 15.5 M10.5 24.5 Q20 19 29.5 24.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <path d="M15.5 10.5 Q21 20 15.5 29.5 M24.5 10.5 Q19 20 24.5 29.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

/** Chakyruu mark plus the wordmark (header). */
export function BrandLogo({ className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 sm:gap-2.5 ${className}`}>
      <BrandMark />
      <span className="font-display text-lg font-extrabold tracking-tight text-night sm:text-xl">
        Chakyruu<span className="text-brand">.kg</span>
      </span>
    </span>
  );
}

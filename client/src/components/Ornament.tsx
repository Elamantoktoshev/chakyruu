/** Stylised "кочкор мүйүз" (ram horn) — the classic Kyrgyz ornament motif. */
const HORN_PATH =
  'M60 34 C60 22 52 12 40 12 C30 12 25 20 28 26 C31 32 40 31 40 25 C40 21 35 20 34 23 ' +
  'M60 34 C60 22 68 12 80 12 C90 12 95 20 92 26 C89 32 80 31 80 25 C80 21 85 20 86 23';

interface OrnamentProps {
  className?: string;
}

export function OrnamentDivider({ className = '' }: OrnamentProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <span className="gold-divider flex-1" />
      <svg viewBox="20 6 80 32" className="h-7 w-auto text-gold" fill="none">
        <path d={HORN_PATH} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="60" cy="36" r="1.8" fill="currentColor" />
      </svg>
      <span className="gold-divider flex-1" />
    </div>
  );
}

/** Repeating ornament band used at the top/bottom of cards. */
export function OrnamentBand({ className = '' }: OrnamentProps) {
  return (
    <svg className={`h-5 w-full text-gold ${className}`} aria-hidden="true">
      <defs>
        <pattern id="horn-band" width="40" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M20 18 C20 12 16 6 10 6 C5 6 3 10 4.5 13 C6 16 10 15.5 10 12.5 M20 18 C20 12 24 6 30 6 C35 6 37 10 35.5 13 C34 16 30 15.5 30 12.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#horn-band)" />
    </svg>
  );
}

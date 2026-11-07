type Props = { className?: string };

/** Felt-like shyrdak tile: interlocking ram-horn (кочкор мүйүз) motifs, used as a background. */
export function ShyrdakBackground({ className = '' }: Props) {
  return (
    <svg className={className} aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <pattern id="shyrdak-tile" width="64" height="64" patternUnits="userSpaceOnUse">
          <rect width="64" height="64" fill="var(--color-burgundy)" />
          <path
            d="M32 8 C22 8 16 16 20 22 C24 28 32 24 30 18 M32 8 C42 8 48 16 44 22 C40 28 32 24 34 18 M32 56 C22 56 16 48 20 42 C24 36 32 40 30 46 M32 56 C42 56 48 48 44 42 C40 36 32 40 34 46"
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <rect x="29" y="29" width="6" height="6" transform="rotate(45 32 32)" fill="var(--color-gold)" />
        </pattern>
        <filter id="felt-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.12 0" />
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#shyrdak-tile)" />
      <rect width="100%" height="100%" filter="url(#felt-noise)" />
    </svg>
  );
}

/** 8-pointed star (Kyrgyz ornament), Batyr template emblem. */
export function KyrgyzStar({ className = '' }: Props) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d="M50 4 L61 39 L96 50 L61 61 L50 96 L39 61 L4 50 L39 39 Z" fill="var(--color-gold)" />
      <path d="M50 18 L57 43 L82 50 L57 57 L50 82 L43 57 L18 50 L43 43 Z" fill="none" stroke="var(--color-burgundy)" strokeWidth="2" transform="rotate(45 50 50)" />
      <circle cx="50" cy="50" r="7" fill="var(--color-burgundy)" />
    </svg>
  );
}

/** Corner garland of simple five-petal flowers (Nazik template). */
export function FlowerCorner({ className = '' }: Props) {
  const flower = (cx: number, cy: number, r: number) =>
    [0, 72, 144, 216, 288].map((a) => (
      <ellipse key={`${cx}-${a}`} cx={cx} cy={cy - r} rx={r * 0.55} ry={r} fill="var(--color-gold)" opacity="0.85" transform={`rotate(${a} ${cx} ${cy})`} />
    ));
  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden="true">
      <path d="M0 150 Q60 120 90 60 Q110 20 150 0" fill="none" stroke="var(--color-burgundy)" strokeWidth="2" opacity="0.5" />
      <path d="M40 132 q14 -18 30 -10 M78 80 q20 -4 22 -24 M110 34 q18 2 26 -14" fill="none" stroke="var(--color-burgundy)" strokeWidth="2" opacity="0.4" />
      {flower(30, 140, 10)}
      {flower(88, 70, 13)}
      {flower(140, 16, 9)}
      {[[30, 140], [88, 70], [140, 16]].map(([cx, cy]) => (
        <circle key={`${cx}c`} cx={cx} cy={cy} r="4" fill="var(--color-burgundy)" />
      ))}
    </svg>
  );
}

/** Crescent moon and stars (Bala template). */
export function MoonStars({ className = '' }: Props) {
  return (
    <svg viewBox="0 0 200 120" className={className} aria-hidden="true">
      <path d="M120 20 a40 40 0 1 0 30 70 a32 32 0 1 1 -30 -70 Z" fill="var(--color-gold)" />
      {[[30, 30, 5], [60, 80, 3.5], [175, 30, 4], [185, 95, 3], [20, 100, 3]].map(([x, y, r]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y - r * 2} L${x + r * 0.6} ${y - r * 0.6} L${x + r * 2} ${y} L${x + r * 0.6} ${y + r * 0.6} L${x} ${y + r * 2} L${x - r * 0.6} ${y + r * 0.6} L${x - r * 2} ${y} L${x - r * 0.6} ${y - r * 0.6} Z`} fill="var(--color-gold)" opacity="0.8" />
      ))}
    </svg>
  );
}

const HORN = 'M50 46 C50 34 42 24 30 24 C20 24 15 32 18 38 C21 44 30 43 30 37 C30 33 25 32 24 35';

/** Round ою-орнек medallion: four ram horns around a rhombus. Hero art when there is no photo. */
export function OyuMedallion({ className = '' }: Props) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.6" />
      {[0, 90, 180, 270].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 50 50)`}>
          <path d={HORN} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d={HORN} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" transform="matrix(-1 0 0 1 100 0)" />
        </g>
      ))}
      <rect x="44" y="44" width="12" height="12" transform="rotate(45 50 50)" fill="currentColor" />
    </svg>
  );
}

/** Thin felt-pattern strip used between Shyrdak sections. */
export function ShyrdakStrip({ className = '' }: Props) {
  return (
    <div className={`relative h-6 overflow-hidden ${className}`} aria-hidden="true">
      <ShyrdakBackground className="absolute inset-0 h-full w-full" />
    </div>
  );
}

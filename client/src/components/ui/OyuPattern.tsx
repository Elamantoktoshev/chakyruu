type Props = { className?: string };

/** Repeating ою (ram-horn) motif for quiet backgrounds; colour comes from `currentColor`. */
export function OyuPattern({ className = '' }: Props) {
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern id="oyu-pattern" width="72" height="72" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            {/* ram horns curling out of a central diamond */}
            <path d="M36 26 L42 36 L36 46 L30 36 Z" />
            <path d="M36 26 C 36 18, 44 14, 48 20 C 51 25, 45 29, 42 25" />
            <path d="M36 26 C 36 18, 28 14, 24 20 C 21 25, 27 29, 30 25" />
            <path d="M36 46 C 36 54, 44 58, 48 52 C 51 47, 45 43, 42 47" />
            <path d="M36 46 C 36 54, 28 58, 24 52 C 21 47, 27 43, 30 47" />
            <circle cx="0" cy="0" r="2.5" />
            <circle cx="72" cy="0" r="2.5" />
            <circle cx="0" cy="72" r="2.5" />
            <circle cx="72" cy="72" r="2.5" />
          </g>
        </pattern>
        <radialGradient id="oyu-fade" cx="0.75" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="oyu-mask">
          <rect width="100%" height="100%" fill="url(#oyu-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#oyu-pattern)" mask="url(#oyu-mask)" />
    </svg>
  );
}

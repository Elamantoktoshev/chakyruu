type Props = { className?: string };

/** Ala-Too ridge at dawn: sky gradient, sun and three mountain layers in palette tones. */
export function Mountains({ className = '' }: Props) {
  return (
    <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="dawn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-burgundy)" />
          <stop offset="0.65" stopColor="var(--color-gold)" />
          <stop offset="1" stopColor="var(--color-cream)" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#dawn-sky)" />
      <circle cx="270" cy="150" r="34" fill="var(--color-cream)" opacity="0.85" />
      <path d="M0 170 L60 120 L110 150 L170 90 L230 140 L290 100 L340 135 L400 110 V260 H0 Z" fill="var(--color-burgundy)" opacity="0.45" />
      <path d="M0 200 L50 160 L95 185 L150 130 L205 175 L260 145 L320 185 L400 150 V260 H0 Z" fill="var(--color-burgundy)" opacity="0.7" />
      {/* snow caps */}
      <path d="M150 130 L138 145 L150 141 L162 147 Z M260 145 L250 156 L260 153 L270 158 Z" fill="var(--color-cream)" opacity="0.9" />
      <path d="M0 230 L70 205 L140 222 L210 200 L290 225 L350 210 L400 222 V260 H0 Z" fill="var(--color-burgundy)" />
    </svg>
  );
}

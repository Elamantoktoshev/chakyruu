type Props = {
  className?: string;
  /** Text on the door (eshik) — the guest's name on personal links. */
  doorLabel?: string;
};

/**
 * Side view of a boz üy (yurt): dome with uuk poles, tündük crown, kerege lattice walls and a
 * two-leaf eshik door. The door leaves carry classes the opening animation scales from their hinges.
 * Colours come from the template palette via currentColor / CSS variables.
 */
export function BozUy({ className = '', doorLabel }: Props) {
  return (
    <svg viewBox="0 0 400 300" className={className} role="img" aria-label="Боз үй">
      <defs>
        <pattern id="kerege" width="18" height="18" patternUnits="userSpaceOnUse">
          <path d="M0 0 L18 18 M18 0 L0 18" stroke="var(--color-burgundy)" strokeWidth="1.4" opacity="0.55" />
        </pattern>
        <linearGradient id="felt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFDF8" />
          <stop offset="1" stopColor="var(--color-cream-dark)" />
        </linearGradient>
      </defs>
      {/* ground shadow */}
      <ellipse cx="200" cy="286" rx="170" ry="9" fill="var(--color-ink)" opacity="0.12" />
      {/* dome */}
      <path d="M48 150 Q200 28 352 150 Z" fill="url(#felt)" stroke="var(--color-burgundy)" strokeWidth="3" />
      {[80, 120, 160, 200, 240, 280, 320].map((x) => (
        <path key={x} d={`M${x} 150 Q${(x + 200) / 2} ${92 - Math.abs(200 - x) / 6} 200 68`} fill="none" stroke="var(--color-burgundy)" strokeWidth="1.2" opacity="0.35" />
      ))}
      {/* decorative band (bash kur) */}
      <rect x="56" y="140" width="288" height="12" fill="var(--color-burgundy)" />
      <path d="M56 146 h288" stroke="var(--color-gold)" strokeWidth="2" strokeDasharray="10 6" />
      {/* tündük */}
      <ellipse cx="200" cy="66" rx="30" ry="8" fill="var(--color-burgundy)" />
      <path d="M176 66 Q200 50 224 66 M188 66 Q200 56 212 66" stroke="var(--color-gold)" strokeWidth="2" fill="none" />
      {/* kerege walls */}
      <rect x="56" y="152" width="288" height="128" fill="url(#felt)" stroke="var(--color-burgundy)" strokeWidth="3" />
      <rect x="62" y="160" width="276" height="112" fill="url(#kerege)" />
      {/* eshik frame */}
      <rect x="160" y="176" width="80" height="104" fill="var(--color-burgundy)" />
      <rect x="166" y="182" width="68" height="98" fill="var(--color-ink)" opacity="0.85" />
      {/* door leaves — scaled to 0 from the hinges when opening */}
      <g className="bozuy-door bozuy-door-left">
        <rect x="166" y="182" width="34" height="98" fill="var(--color-gold)" />
        <path d="M172 196 h22 M172 266 h22 M183 196 v70" stroke="var(--color-burgundy)" strokeWidth="2" opacity="0.6" />
      </g>
      <g className="bozuy-door bozuy-door-right">
        <rect x="200" y="182" width="34" height="98" fill="var(--color-gold)" />
        <path d="M206 196 h22 M206 266 h22 M217 196 v70" stroke="var(--color-burgundy)" strokeWidth="2" opacity="0.6" />
      </g>
      {doorLabel && (
        // A felt plaque above the eshik with the guest's name on it.
        <g>
          <rect x="96" y="156" width="208" height="26" rx="13" fill="#FFFDF8" stroke="var(--color-gold)" strokeWidth="2" />
          <text x="200" y="174" textAnchor="middle" fontFamily="var(--font-serif)" fontSize="14" fontStyle="italic" fill="var(--color-burgundy)">
            {doorLabel.length > 26 ? `${doorLabel.slice(0, 25)}…` : doorLabel}
          </text>
        </g>
      )}
    </svg>
  );
}

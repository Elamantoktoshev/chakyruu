type Props = { className?: string };

/** Tündük seen from inside the yurt: crown ring with crossed bent poles and radiating uuk. */
export function Tunduk({ className = '' }: Props) {
  const uuk = Array.from({ length: 24 }, (_, i) => (i * 360) / 24);
  return (
    <svg viewBox="0 0 300 300" className={className} aria-hidden="true">
      {uuk.map((angle) => (
        <line key={angle} x1="150" y1="150" x2="150" y2="0" stroke="var(--color-burgundy)" strokeWidth="3" opacity="0.5" transform={`rotate(${angle} 150 150)`} />
      ))}
      <circle cx="150" cy="150" r="62" fill="var(--color-cream)" stroke="var(--color-burgundy)" strokeWidth="8" />
      <path d="M95 128 Q150 100 205 128 M95 150 Q150 122 205 150 M95 172 Q150 144 205 172" stroke="var(--color-burgundy)" strokeWidth="5" fill="none" />
      <path d="M128 95 Q100 150 128 205 M150 95 Q122 150 150 205 M172 95 Q144 150 172 205" stroke="var(--color-burgundy)" strokeWidth="5" fill="none" />
      <circle cx="150" cy="150" r="62" fill="none" stroke="var(--color-gold)" strokeWidth="2" />
    </svg>
  );
}

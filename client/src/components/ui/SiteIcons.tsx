type Props = { className?: string };

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** Chat bubble with a handset: "write to us on WhatsApp". */
export function ChatIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1L4 20z" />
      <path {...stroke} strokeWidth={1.8} d="M9.2 9.3c.3 1.9 1.6 3.7 3.6 4.6l1-1 1.8.8-.4 1.4c-3.2.2-6.5-3-6.5-6.2l1.4-.4.8 1.8-1 1z" />
    </svg>
  );
}

export function PlayIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle {...stroke} cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5z" fill="currentColor" />
    </svg>
  );
}

export function ArrowRightIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function CheckCircleIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle {...stroke} cx="12" cy="12" r="9" />
      <path {...stroke} d="M8 12.5l2.7 2.7L16 9.8" />
    </svg>
  );
}

export function NoteIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M9 18V5l11-2v13" />
      <circle {...stroke} cx="6" cy="18" r="3" />
      <circle {...stroke} cx="17" cy="16" r="3" />
    </svg>
  );
}

export function PinIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" />
      <circle {...stroke} cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export function CloseIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

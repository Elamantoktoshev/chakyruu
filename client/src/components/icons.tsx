type Props = { className?: string };

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const PinIcon = ({ className = 'h-5 w-5' }: Props) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

export const CalendarIcon = ({ className = 'h-5 w-5' }: Props) => (
  <svg {...base} className={className} aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);

export const CheckCircleIcon = ({ className = 'h-5 w-5' }: Props) => (
  <svg {...base} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12.3 2.4 2.4 4.8-5" />
  </svg>
);

export const HeartIcon = ({ className = 'h-5 w-5' }: Props) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.4 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />
  </svg>
);

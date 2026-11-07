type Props = { className?: string };

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const LinkIcon = ({ className = 'h-6 w-6' }: Props) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
);

export const TapIcon = ({ className = 'h-6 w-6' }: Props) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M12 10.5V9a1.5 1.5 0 0 1 3 0v2.5M15 11a1.5 1.5 0 0 1 3 0v3.5a6 6 0 0 1-6 6h-.6a6 6 0 0 1-5.1-2.9L4 15a1.5 1.5 0 0 1 2.5-1.6L9 16" />
  </svg>
);

export const MusicIcon = ({ className = 'h-6 w-6' }: Props) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M9 18V6l11-2v12" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="16" r="2.5" />
  </svg>
);

export const MapIcon = ({ className = 'h-6 w-6' }: Props) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
);

export const HeartIcon = ({ className = 'h-6 w-6' }: Props) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.4 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />
  </svg>
);

export const LanguageIcon = ({ className = 'h-6 w-6' }: Props) => (
  <svg {...base} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.3 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.3-3.5-8.5s1-5.9 3.5-8.5Z" />
  </svg>
);

export const ChevronIcon = ({ className = 'h-5 w-5' }: Props) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

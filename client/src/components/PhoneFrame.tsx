import type { ReactNode } from 'react';

type Props = { children: ReactNode; className?: string };

/** A phone-shaped scroll container for previews. */
export function PhoneFrame({ children, className = '' }: Props) {
  return (
    <div
      className={`relative mx-auto w-full max-w-[22rem] rounded-[2.75rem] border-[10px] border-ink bg-ink p-0 shadow-2xl shadow-ink/30 ${className}`}
    >
      <div className="absolute left-1/2 top-1.5 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" aria-hidden="true" />
      <div className="h-[38rem] overflow-y-auto overscroll-contain rounded-[2rem] bg-cream [scrollbar-width:none]">
        {children}
      </div>
    </div>
  );
}

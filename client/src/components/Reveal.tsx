import type { ReactNode } from 'react';
import { useReveal } from '../hooks/useReveal';

type Props = { children: ReactNode; className?: string; as?: 'div' | 'section' | 'li'; delayMs?: number };

/** Fades its content in once when scrolled into view (opacity + transform only). */
export function Reveal({ children, className = '', as: Tag = 'div', delayMs = 0 }: Props) {
  const { ref, isVisible } = useReveal<HTMLElement>();
  return (
    <Tag
      ref={ref as never}
      className={`reveal ${isVisible ? 'is-visible' : ''} ${className}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

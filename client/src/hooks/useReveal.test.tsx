// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useReveal } from './useReveal';

function Probe() {
  const { ref, isVisible } = useReveal<HTMLDivElement>();
  return <div ref={ref}>{isVisible ? 'visible' : 'hidden'}</div>;
}

describe('useReveal', () => {
  it('shows content immediately where IntersectionObserver is not available', () => {
    render(<Probe />);
    expect(screen.getByText('visible')).toBeTruthy();
  });
});

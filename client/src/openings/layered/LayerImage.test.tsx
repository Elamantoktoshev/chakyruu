// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LayerImage } from './LayerImage';

afterEach(cleanup);

const palette = { primary: '#5A1E2B', accent: '#C9A24B', background: '#FBF5EA', ink: '#2B1A14', card: '#F3E4E7', isDark: false };

describe('LayerImage', () => {
  it('turns into a labelled placeholder when the file is missing', () => {
    const { container } = render(<LayerImage src="/templates/x/seal.webp" label="Мөөр" palette={palette} />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('[data-placeholder="Мөөр"]')).not.toBeNull();
  });

  it('tries again when a new file arrives (e.g. just uploaded in /admin)', () => {
    const { container, rerender } = render(<LayerImage src="/templates/x/seal.webp" label="Мөөр" palette={palette} />);
    fireEvent.error(container.querySelector('img')!);
    rerender(<LayerImage src="https://cdn.example.com/seal-2.webp" label="Мөөр" palette={palette} />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example.com/seal-2.webp');
    expect(container.querySelector('[data-placeholder]')).toBeNull();
  });
});

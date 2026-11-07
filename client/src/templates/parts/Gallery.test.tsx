// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { GalleryPhoto } from '../../api/types';
import { LanguageProvider } from '../../i18n/LanguageContext';
import { Gallery } from './Gallery';

const photo = (id: string, url = `/uploads/${id}.webp`): GalleryPhoto => ({ id, url, width: 1600, height: 1200 });

function renderGallery(photos: GalleryPhoto[]) {
  return render(
    <LanguageProvider>
      <Gallery photos={photos} labelClassName="" />
    </LanguageProvider>,
  );
}

afterEach(cleanup);

describe('Gallery', () => {
  it('renders nothing without photos', () => {
    const { container } = renderGallery([]);
    expect(container.innerHTML).toBe('');
  });

  it('shows every photo as a lazy, sized slide with arrows for several photos', () => {
    const { container } = renderGallery([photo('a'), photo('b'), photo('c')]);
    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(3);
    for (const image of images) {
      expect(image.getAttribute('loading')).toBe('lazy');
      expect(image.getAttribute('width')).toBe('1600');
      expect(image.getAttribute('height')).toBe('1200');
    }
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('skips unsafe URLs and hides arrows for a single photo', () => {
    const { container } = renderGallery([photo('a'), photo('evil', 'javascript:alert(1)')]);
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

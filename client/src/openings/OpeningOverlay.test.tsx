// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext';
import { OpeningOverlay, initialsOf } from './OpeningOverlay';

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

const renderOverlay = (props: Partial<Parameters<typeof OpeningOverlay>[0]> = {}) =>
  render(
    <LanguageProvider>
      <OpeningOverlay animation="BOZ_UY" doorLabel="Асан байке" mode="live" {...props} />
    </LanguageProvider>,
  );

beforeEach(() => mockReducedMotion(false));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('OpeningOverlay', () => {
  it('waits for "Кириңиз", reports the tap (music may start) and then gets out of the way', async () => {
    vi.useFakeTimers();
    const onEnter = vi.fn();
    renderOverlay({ onEnter });
    const enter = screen.getByRole('button', { name: 'Кириңиз' });
    expect(screen.getByRole('dialog', { name: 'Асан байке' })).toBeTruthy();
    expect(document.activeElement).toBe(enter);
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(enter);
    expect(onEnter).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.queryByRole('button', { name: 'Кириңиз' })).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('can be skipped at once', () => {
    const onEnter = vi.fn();
    renderOverlay({ onEnter });
    fireEvent.click(screen.getByRole('button', { name: 'Өткөрүп жиберүү' }));
    expect(onEnter).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Кириңиз' })).toBeNull();
  });

  it('shows nothing for "Жөнөкөй" or when the guest prefers reduced motion', () => {
    renderOverlay({ animation: 'NONE' });
    expect(screen.queryByRole('button', { name: 'Кириңиз' })).toBeNull();
    cleanup();
    mockReducedMotion(true);
    renderOverlay({ animation: 'CURTAINS' });
    expect(screen.queryByRole('button', { name: 'Кириңиз' })).toBeNull();
  });
});

describe('initialsOf', () => {
  it('takes the first letters of the two names for the wax seal', () => {
    expect(initialsOf('Айбек & Айзада')).toBe('А & А');
    expect(initialsOf('Нурлан жана Гүлнара')).toBe('Н & Г');
    expect(initialsOf('Дина & Тимур')).toBe('Д & Т');
    expect(initialsOf('Бакыт и Айгүл')).toBe('Б & А');
    expect(initialsOf('♥')).toBe('♥');
  });
});

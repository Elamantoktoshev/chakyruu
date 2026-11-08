// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../i18n/LanguageContext';
import { PromoTab } from './PromoTab';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ok = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data, error: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });

const EXISTING = {
  id: 'p1',
  code: 'TOI2027',
  discountPercent: 20,
  maxUses: 10,
  usedCount: 3,
  expiresAt: null,
  isActive: true,
  note: 'Instagram',
  createdAt: '2026-11-09T00:00:00.000Z',
};

describe('PromoTab', () => {
  it('lists codes with their usage and creates a new one', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return ok({ ...EXISTING, id: 'p2', code: 'FREE', discountPercent: 100, maxUses: null, usedCount: 0, note: null });
      return ok([EXISTING]);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <LanguageProvider>
        <PromoTab />
      </LanguageProvider>,
    );

    expect(await screen.findByText('Колдонулду: 3 / 10')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Код'), { target: { value: 'free' } });
    fireEvent.change(screen.getByLabelText('Арзандатуу, %'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Акыркы күнү/), { target: { value: '2027-01-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Промокод түзүү' }));

    expect(await screen.findByText('FREE')).toBeTruthy();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/promo-codes',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ code: 'free', discountPercent: 100, maxUses: null, expiresAt: '2027-01-31T23:59:59+06:00', note: null }),
        }),
      ),
    );
  });
});

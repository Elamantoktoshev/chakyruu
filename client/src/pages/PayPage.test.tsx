// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { LanguageProvider } from '../i18n/LanguageContext';
import { PayPage } from './PayPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const reply = (status: number, data: unknown, details?: unknown) =>
  new Response(
    JSON.stringify(status < 400 ? { success: true, data, error: null } : { success: false, data: null, error: { message: 'no', details } }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );

const INVITATION = { id: 'inv1', slug: 'asan-aigul', status: 'DRAFT', hostNames: 'Асан & Айгүл', isGift: false, priceSom: 499 };

type Handler = (url: string, init?: RequestInit) => Response | undefined;

function stubServer(handler: Handler) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const custom = handler(url, init);
    if (custom) return custom;
    if (url.endsWith('/auth/me')) return reply(200, { id: 'u1', phone: '+996700123456', email: null, name: null, role: 'OWNER', organizationId: null });
    if (url.endsWith('/my/invitations/inv1')) return reply(200, INVITATION);
    return reply(404, null);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPay() {
  return render(
    <MemoryRouter initialEntries={['/pay/inv1']}>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/pay/:id" element={<PayPage />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

async function applyCode(code: string) {
  fireEvent.change(await screen.findByLabelText('Промокод'), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Колдонуу' }));
}

describe('PayPage — promo codes', () => {
  it('shows the discounted price and pays with the code', async () => {
    const fetchMock = stubServer((url) => {
      if (url.endsWith('/promo')) return reply(200, { code: 'TOI2027', discountPercent: 20, priceSom: 499, finalPriceSom: 399 });
      if (url.endsWith('/publish')) return reply(200, { status: 'PUBLISHED', slug: 'asan-aigul', paymentId: 'p1' });
      return undefined;
    });
    renderPay();
    await applyCode('toi2027');

    expect(await screen.findByText('TOI2027: −20%')).toBeTruthy();
    expect(screen.getByText('499 сом').className).toContain('line-through');
    fireEvent.click(screen.getByRole('button', { name: /399 сом/ }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/my/invitations/inv1/publish', expect.objectContaining({ body: JSON.stringify({ provider: 'MBANK', promoCode: 'TOI2027' }) })),
    );
  });

  it('turns the button into "publish for free" with a 100 % code and hides the banks', async () => {
    stubServer((url) => (url.endsWith('/promo') ? reply(200, { code: 'FREE', discountPercent: 100, priceSom: 499, finalPriceSom: 0 }) : undefined));
    renderPay();
    await applyCode('free');
    expect(await screen.findByRole('button', { name: 'Бекер жарыялоо' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Симбанк' })).toBeNull();
  });

  it('explains why a code does not work', async () => {
    stubServer((url) => (url.endsWith('/promo') ? reply(400, null, { reason: 'expired' }) : undefined));
    renderPay();
    await applyCode('old');
    expect((await screen.findByRole('alert')).textContent).toBe('Промокоддун мөөнөтү бүттү');
  });

  it('does not say "already published" for a second tap while a transfer is still open', async () => {
    stubServer((url) => (url.endsWith('/publish') ? reply(409, null, { reason: 'in_progress' }) : undefined));
    renderPay();
    fireEvent.click(await screen.findByRole('button', { name: /499 сом/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/даярдалып/);
  });
});

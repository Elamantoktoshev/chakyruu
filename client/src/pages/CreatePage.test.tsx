// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { LanguageProvider } from '../i18n/LanguageContext';
import { CreatePage } from './CreatePage';

beforeAll(() => {
  // Cards reveal their previews when they scroll into view.
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} });
});

const ok = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data, error: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });

const TEMPLATES = [
  { id: 'tpl-wedding', name: 'Ак калпак', type: 'WEDDING', componentKey: 'classic', isUniversal: false, config: {}, priceSom: null, badge: 'HIT', description: {} },
  { id: 'tpl-kyz', name: 'Кызыл кийиз', type: 'KYZ_UZATUU', componentKey: 'classic', isUniversal: false, config: {}, priceSom: 699, badge: null, description: {} },
];

function stubServer() {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/public/templates')) return ok(TEMPLATES);
    if (url.endsWith('/my/invitations') && init?.method === 'POST') return ok({ id: 'draft-1' });
    if (url.endsWith('/auth/me')) return ok({ id: 'u1', phone: '+996700123456', email: null, name: null, role: 'OWNER', organizationId: null });
    return ok(null);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderCreate(path = '/create') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/create" element={<CreatePage />} />
            <Route path="/create/:id" element={<p>builder page</p>} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

describe('CreatePage', () => {
  it('shows the design catalog with the toi filters', async () => {
    stubServer();
    renderCreate();
    expect(await screen.findByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.getByText('Ак калпак')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /Кыз узатуу/ }));
    expect(screen.queryByText('Ак калпак')).toBeNull();
    expect(screen.getByText('Кызыл кийиз')).toBeTruthy();
  });

  it('creates a draft from the chosen design (keeping a gift code) and opens the builder', async () => {
    const fetchMock = stubServer();
    renderCreate('/create?gift=ABC123');
    const card = (await screen.findByText('Ак калпак')).closest('article') ?? document.body;
    fireEvent.click(within(card as HTMLElement).getByRole('link', { name: /Ыңгайлаштыруу/ }));

    expect(await screen.findByText('builder page')).toBeTruthy();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/my/invitations',
        expect.objectContaining({ method: 'POST', body: expect.stringContaining('"giftCode":"ABC123"') }),
      ),
    );
  });
});

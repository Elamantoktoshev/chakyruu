// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../auth/AuthContext';
import { LanguageProvider } from '../../i18n/LanguageContext';
import { AccountBar } from './AccountBar';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ok = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data, error: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });

function stubSignedIn(user: { phone: string | null; email: string | null }) {
  const fetchMock = vi.fn(async (url: string) =>
    url.endsWith('/auth/logout')
      ? ok({ loggedOut: true })
      : ok({ id: 'u1', name: null, role: 'OWNER', organizationId: null, ...user }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderCabinet() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<AccountBar />} />
            <Route path="/" element={<p>home page</p>} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

describe('AccountBar', () => {
  it('shows the phone and logs out to the home page', async () => {
    const fetchMock = stubSignedIn({ phone: '+996700123456', email: null });
    renderCabinet();
    expect(await screen.findByText('+996700123456')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Чыгуу' }));

    expect(await screen.findByText('home page')).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' })));
  });

  it('shows the e-mail for Google accounts', async () => {
    stubSignedIn({ phone: null, email: 'aizada@gmail.com' });
    renderCabinet();
    expect(await screen.findByText('aizada@gmail.com')).toBeTruthy();
  });
});

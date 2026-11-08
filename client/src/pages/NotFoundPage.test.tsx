// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { LanguageProvider } from '../i18n/LanguageContext';
import { InvitationPage } from './InvitationPage';
import { NotFoundPage } from './NotFoundPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const envelope = (status: number, data: unknown) =>
  new Response(JSON.stringify(status < 400 ? { success: true, data, error: null } : { success: false, data: null, error: { message: 'Not found' } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Anonymous visitor; every invitation lookup is a 404. */
function stubServer() {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('/auth/me') ? envelope(401, null) : envelope(404, null))));
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/:slug" element={<InvitationPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

describe('NotFoundPage', () => {
  it('offers to create an invitation or go home when an invitation link is wrong', async () => {
    stubServer();
    renderAt('/ормормо');
    const main = within(await screen.findByRole('main'));
    expect(main.getByRole('link', { name: /түзүү/i }).getAttribute('href')).toBe('/login?next=/create');
    expect(main.getByRole('link', { name: 'Башкы бет' }).getAttribute('href')).toBe('/');
  });

  it('also catches deeper unknown paths', async () => {
    stubServer();
    renderAt('/some/unknown/page');
    const main = within(await screen.findByRole('main'));
    expect(main.getByRole('link', { name: 'Башкы бет' })).toBeTruthy();
  });
});

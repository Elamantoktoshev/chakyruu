// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { LanguageProvider } from '../i18n/LanguageContext';
import { LoginPage } from './LoginPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const envelope = (status: number, data: unknown) =>
  new Response(JSON.stringify(status < 400 ? { success: true, data, error: null } : { success: false, data: null, error: { message: 'no' } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Anonymous visitor; the server answers whether Google sign-in is configured. */
function stubServer({ google, phone = true }: { google: boolean; phone?: boolean }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => (url.endsWith('/auth/options') ? envelope(200, { google, phone }) : envelope(401, null))),
  );
}

function renderLogin(path = '/login?next=/create') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage — Google sign-in', () => {
  it('offers Google when the server has it on, returning to the requested page', async () => {
    stubServer({ google: true });
    renderLogin();
    const link = await screen.findByRole('link', { name: /Google/ });
    expect(link.getAttribute('href')).toBe('/api/auth/google/start?next=%2Fcreate');
  });

  it('hides the Google button when the server has it off', async () => {
    stubServer({ google: false });
    renderLogin();
    // The phone form is there; the Google link never appears.
    expect(await screen.findByRole('textbox', { hidden: false })).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole('link', { name: /Google/ })).toBeNull();
  });

  it('explains a failed Google sign-in', async () => {
    stubServer({ google: true });
    renderLogin('/login?error=google');
    expect((await screen.findByRole('alert')).textContent).toMatch(/Google/);
  });

  it('shows only Google when phone login is switched off', async () => {
    stubServer({ google: true, phone: false });
    renderLogin();
    expect(await screen.findByRole('link', { name: /Google/ })).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByText('же')).toBeNull();
  });

  it('still explains a failed Google sign-in in Google-only mode', async () => {
    stubServer({ google: true, phone: false });
    renderLogin('/login?error=google');
    expect((await screen.findByRole('alert')).textContent).toMatch(/Google/);
  });

  it('tells Instagram users to open the page in a real browser', async () => {
    stubServer({ google: true, phone: false });
    const original = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone) Instagram 300.0', configurable: true });
    try {
      renderLogin();
      expect(await screen.findByText('Бул жерден Google менен кирүүгө болбойт')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Шилтемени көчүрүү' })).toBeTruthy();
    } finally {
      Object.defineProperty(navigator, 'userAgent', { value: original, configurable: true });
    }
  });
});

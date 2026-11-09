// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OwnerInvitation } from '../api/types';
import { LanguageProvider } from '../i18n/LanguageContext';
import { MusicPicker } from './MusicPicker';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ok = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data, error: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });

function renderPicker(music: OwnerInvitation['music'] = null) {
  vi.stubGlobal('fetch', vi.fn(async () => ok([])));
  const invitation = { id: 'inv1', music, musicTrackId: null } as unknown as OwnerInvitation;
  return render(
    <LanguageProvider>
      <MusicPicker invitation={invitation} onChange={() => undefined} beforeUpload={async () => undefined} />
    </LanguageProvider>,
  );
}

describe('MusicPicker — own song', () => {
  it('shows the own-song upload right away, before the catalogue', () => {
    const { container } = renderPicker();
    expect(screen.getByRole('heading', { name: 'Өз ырыңызды коюңуз' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ырды жүктөө' })).toBeTruthy();
    // No hidden "own" tab at the end of the category row any more.
    expect(screen.queryByRole('button', { name: 'Өз обонум' })).toBeNull();
    const input = container.querySelector('input[type="file"]');
    expect(input?.getAttribute('accept')).toContain('.m4a');
    expect(input?.getAttribute('accept')).toContain('.ogg');
  });

  it('shows the uploaded song with replace and remove', () => {
    renderPicker({ src: 'https://cdn.example.com/uploads/own.mp3', title: null, durationSec: 180, startSec: 0, isCustom: true });
    expect(screen.getAllByText('Сиздин обонуңуз').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Башка ыр жүктөө' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Өчүрүү' })).toBeTruthy();
  });
});

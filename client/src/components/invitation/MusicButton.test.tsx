// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MusicView } from '../../api/types';
import { LanguageProvider } from '../../i18n/LanguageContext';
import { MusicButton } from './MusicButton';

const MUSIC: MusicView = { src: '/music/komuz.mp3', title: 'Комуз', durationSec: 180, startSec: 35, isCustom: false };

function renderPlayer(music: MusicView | null, startSignal = 0) {
  return render(
    <LanguageProvider>
      <MusicButton music={music} startSignal={startSignal} />
    </LanguageProvider>,
  );
}

let play: ReturnType<typeof vi.fn<() => Promise<void>>>;

beforeEach(() => {
  play = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  // The duration is known, so the start second is applied right away.
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(1);
  vi.spyOn(HTMLMediaElement.prototype, 'duration', 'get').mockReturnValue(180);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('MusicButton', () => {
  it('renders nothing without music', () => {
    const { container } = renderPlayer(null);
    expect(container.querySelector('audio')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('starts from the chosen second, silently at first, when the guest taps "Кириңиз"', async () => {
    const { container, rerender } = renderPlayer(MUSIC);
    expect(play).not.toHaveBeenCalled();

    await act(async () => {
      rerender(
        <LanguageProvider>
          <MusicButton music={MUSIC} startSignal={1} />
        </LanguageProvider>,
      );
    });

    const audio = container.querySelector('audio') as HTMLAudioElement;
    expect(play).toHaveBeenCalledTimes(1);
    expect(audio.currentTime).toBe(35);
    expect(audio.volume).toBe(0); // the fade-in raises it over 2 s
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('.vinyl.is-spinning')).not.toBeNull();
  });

  it('pauses and resumes on tap', async () => {
    const { container } = renderPlayer(MUSIC);
    const button = screen.getByRole('button');
    await act(async () => fireEvent.click(button));
    expect(button.getAttribute('aria-pressed')).toBe('true');
    await act(async () => fireEvent.click(button));
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('.vinyl.is-spinning')).toBeNull();
  });

  it('hides itself when the browser cannot play the file', async () => {
    play.mockRejectedValueOnce(new Error('NotSupportedError'));
    renderPlayer(MUSIC);
    await act(async () => fireEvent.click(screen.getByRole('button')));
    expect(screen.queryByRole('button')).toBeNull();
  });
});

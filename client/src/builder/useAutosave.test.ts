// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTOSAVE_INTERVAL_MS, useAutosave } from './useAutosave';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(save = vi.fn().mockResolvedValue({ slug: 'aibek-aizada' })) {
  const onSaved = vi.fn();
  const hook = renderHook(() => useAutosave({ save, onSaved }));
  return { save, onSaved, hook };
}

async function tick() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(AUTOSAVE_INTERVAL_MS);
  });
}

describe('useAutosave', () => {
  it('merges queued edits and saves them once per interval', async () => {
    const { save, onSaved, hook } = setup();
    act(() => {
      hook.result.current.enqueue({ hostNames: 'Ай' });
      hook.result.current.enqueue({ hostNames: 'Айбек' });
      hook.result.current.enqueue({ venueName: 'Ала-Тоо' });
    });
    expect(hook.result.current.status).toBe('dirty');
    expect(save).not.toHaveBeenCalled();

    await tick();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ hostNames: 'Айбек', venueName: 'Ала-Тоо' });
    expect(onSaved).toHaveBeenCalledWith({ slug: 'aibek-aizada' });
    expect(hook.result.current.status).toBe('saved');
  });

  it('does not call the server when nothing changed', async () => {
    const { save } = setup();
    await tick();
    await tick();
    expect(save).not.toHaveBeenCalled();
  });

  it('re-queues a failed patch under newer edits and retries', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({});
    const { hook } = setup(save);

    act(() => hook.result.current.enqueue({ hostNames: 'Айбек', venueName: 'Old' }));
    await tick();
    expect(hook.result.current.status).toBe('error');

    act(() => hook.result.current.enqueue({ venueName: 'New' }));
    await tick();
    expect(save).toHaveBeenLastCalledWith({ hostNames: 'Айбек', venueName: 'New' });
    expect(hook.result.current.status).toBe('saved');
  });

  it('flush() saves immediately without waiting for the interval', async () => {
    const { save, hook } = setup();
    act(() => hook.result.current.enqueue({ adultsOnly: true }));
    await act(() => hook.result.current.flush());
    expect(save).toHaveBeenCalledWith({ adultsOnly: true });
  });

  it('saves what is left when the builder unmounts', async () => {
    const { save, hook } = setup();
    act(() => hook.result.current.enqueue({ message: 'Кош келиңиздер' }));
    hook.unmount();
    expect(save).toHaveBeenCalledWith({ message: 'Кош келиңиздер' });
  });
});

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import { installGracefulShutdown } from './shutdown.js';

const REQUEST_MS = 150;

describe('installGracefulShutdown', () => {
  it('lets a running request finish, then releases resources and exits with 0', async () => {
    const server = createServer((_req, res) => setTimeout(() => res.end('done'), REQUEST_MS));
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    const release = vi.fn(async () => undefined);
    const exit = vi.fn();
    const shutdown = installGracefulShutdown(server, release, { exit });

    const response = fetch(`http://127.0.0.1:${port}/`).then((res) => res.text());
    await new Promise((resolve) => setTimeout(resolve, 30));
    const stopped = shutdown();

    expect(await response).toBe('done');
    await stopped;
    expect(release).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('runs once even if the signal arrives twice', async () => {
    const server = createServer((_req, res) => res.end());
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const release = vi.fn(async () => undefined);
    const shutdown = installGracefulShutdown(server, release, { exit: vi.fn() });
    await Promise.all([shutdown(), shutdown()]);
    expect(release).toHaveBeenCalledTimes(1);
  });
});

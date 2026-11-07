import type { Server } from 'node:http';

/** App Platform sends SIGTERM and waits a bit before killing the container. */
const SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * On SIGTERM/SIGINT: stop accepting connections, let running requests finish, close idle
 * keep-alive sockets, then release resources (database). Forces exit after a timeout.
 */
export function installGracefulShutdown(
  server: Server,
  release: () => Promise<void>,
  { timeoutMs = SHUTDOWN_TIMEOUT_MS, exit = (code: number) => process.exit(code) } = {},
): () => Promise<void> {
  let shuttingDown: Promise<void> | null = null;

  const shutdown = (): Promise<void> => {
    shuttingDown ??= (async () => {
      const forced = setTimeout(() => {
        console.error(`[shutdown] requests still running after ${timeoutMs} ms, exiting`);
        exit(1);
      }, timeoutMs);
      forced.unref();
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeIdleConnections();
      });
      await release();
      clearTimeout(forced);
      exit(0);
    })();
    return shuttingDown;
  };

  process.once('SIGTERM', () => void shutdown());
  process.once('SIGINT', () => void shutdown());
  return shutdown;
}

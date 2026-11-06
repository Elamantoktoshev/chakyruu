import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';

function readConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set — copy .env.example to .env');
  const port = Number(process.env.PORT ?? 4000);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`Invalid PORT: ${process.env.PORT}`);
  return { port, corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' };
}

const config = readConfig();
const server = createApp(config).listen(config.port, () => {
  console.info(`API listening on http://localhost:${config.port}`);
});

async function shutdown(): Promise<void> {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

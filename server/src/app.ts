import cors from 'cors';
import express, { type Express } from 'express';
import { errorHandler, notFoundHandler, sendOk } from './lib/http.js';
import { invitationRouter } from './invitations/invitation.routes.js';

export interface AppConfig {
  corsOrigin: string;
}

export function createApp({ corsOrigin }: AppConfig): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: '20kb' }));

  app.get('/api/health', (_req, res) => sendOk(res, { status: 'ok' }));
  app.use('/api/invitations', invitationRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

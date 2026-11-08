import { PHONE_PATTERN } from '@chakyruu/shared';
import { ElsomGateway, readElsomConfig } from './elsom.gateway.js';
import { FakeGateway } from './fake.gateway.js';
import { GATEWAY_IDS, type GatewayId, type PaymentGateway } from './gateway.js';
import { ManualGateway } from './manual.gateway.js';
import { MBankGateway, readMBankConfig } from './mbank.gateway.js';
import { ODengiGateway, readODengiConfig } from './odengi.gateway.js';

/** Gateways that may run in production today. Provider skeletons join this list once implemented. */
const PRODUCTION_READY: readonly GatewayId[] = ['manual'];

/** Picks the payment implementation from PAYMENT_PROVIDER (default: fake). */
export function createGatewayFromEnv(env: NodeJS.ProcessEnv, isProduction: boolean): PaymentGateway {
  const id = (env.PAYMENT_PROVIDER ?? 'fake') as GatewayId;
  if (!GATEWAY_IDS.includes(id)) throw new Error(`Unknown PAYMENT_PROVIDER "${id}" — use one of ${GATEWAY_IDS.join(', ')}`);
  if (isProduction && !PRODUCTION_READY.includes(id)) {
    throw new Error(`PAYMENT_PROVIDER=${id} cannot run in production yet (ready: ${PRODUCTION_READY.join(', ')})`);
  }
  switch (id) {
    case 'fake':
      return new FakeGateway({ webhookSecret: env.FAKE_WEBHOOK_SECRET });
    case 'manual': {
      const mbank = env.MANUAL_PAYMENT_RECEIVER ?? '';
      if (!PHONE_PATTERN.test(mbank)) throw new Error('MANUAL_PAYMENT_RECEIVER must be the MBank number, +996XXXXXXXXX');
      // Simbank transfers go to the same number unless a separate one is set.
      const simbank = env.MANUAL_PAYMENT_RECEIVER_SIMBANK || mbank;
      if (!PHONE_PATTERN.test(simbank)) throw new Error('MANUAL_PAYMENT_RECEIVER_SIMBANK must be the Simbank number, +996XXXXXXXXX');
      return new ManualGateway({ MBANK: mbank, SIMBANK: simbank });
    }
    case 'mbank':
      return new MBankGateway(readMBankConfig(env));
    case 'odengi':
      return new ODengiGateway(readODengiConfig(env));
    case 'elsom':
      return new ElsomGateway(readElsomConfig(env));
  }
}

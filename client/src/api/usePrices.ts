import { INVITATION_PRICE_CODE } from '@chakyruu/shared';
import { useCallback } from 'react';
import { api } from './client';
import type { PublicPrice } from './types';
import { useAsync } from './useAsync';

/** Active prices from the database (editable in /admin). */
export function usePrices(): { prices: PublicPrice[]; publishPriceSom: number | null } {
  const load = useCallback(() => api.listPrices(), []);
  const state = useAsync(load);
  const prices = state.status === 'success' ? state.data : [];
  const publish = prices.find((price) => price.code === INVITATION_PRICE_CODE);
  return { prices, publishPriceSom: publish?.amountSom ?? null };
}

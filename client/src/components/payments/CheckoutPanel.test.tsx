// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CheckoutView } from '../../api/types';
import { LanguageProvider } from '../../i18n/LanguageContext';
import { copyText } from '../../lib/share';
import { CheckoutPanel } from './CheckoutPanel';

vi.mock('../../lib/share', () => ({ copyText: vi.fn(async () => true) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderManual(instructions: Extract<CheckoutView, { kind: 'manual' }>['instructions']) {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <CheckoutPanel checkout={{ kind: 'manual', instructions }} paymentId="p1" />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

describe('CheckoutPanel — manual MBank transfer', () => {
  it('asks for names and the toy day in the comment, not a code', async () => {
    renderManual({ receiver: '0700 123 456', amountSom: 499, comment: 'Айбек & Айзада 15.06.2027', reference: 'CH-7K3MX' });

    expect(screen.getByText('Айбек & Айзада 15.06.2027')).toBeTruthy();
    expect(screen.queryByText('CH-7K3MX')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Айбек & Айзада 15\.06\.2027/ }));
    await waitFor(() => expect(copyText).toHaveBeenCalledWith('Айбек & Айзада 15.06.2027'));
  });

  it('falls back to the code for payments started before comments existed', () => {
    renderManual({ receiver: '0700 123 456', amountSom: 499, reference: 'CH-7K3MX' });
    expect(screen.getByText('CH-7K3MX')).toBeTruthy();
  });
});

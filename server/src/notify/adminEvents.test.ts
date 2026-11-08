import { describe, expect, it } from 'vitest';
import { formatAdminMessage } from './adminEvents.js';

const APP_URL = 'https://chakyruu.kg';

describe('formatAdminMessage', () => {
  it('announces a pending MBank transfer with amount, the payer comment, reference and a link to confirm it', () => {
    const text = formatAdminMessage(
      {
        type: 'payment_pending',
        amountSom: 499,
        reference: 'CH-7K3MX',
        comment: 'Айбек & Айзада 15.06.2027',
        method: 'MBANK',
        description: 'Chakyruu.kg: aibek-aizada',
      },
      APP_URL,
    );
    expect(text).toContain('499 сом');
    expect(text).toContain('Айбек &amp; Айзада 15.06.2027');
    expect(text).toContain('CH-7K3MX');
    expect(text).toContain('MBANK');
    expect(text).toContain('https://chakyruu.kg/admin');
  });

  it('announces a successful payment and a published invitation', () => {
    expect(formatAdminMessage({ type: 'payment_succeeded', amountSom: 499, method: 'MBANK', description: 'Chakyruu.kg: aibek' }, APP_URL)).toContain('499 сом');
    const published = formatAdminMessage({ type: 'invitation_published', hostNames: 'Айбек & Айзада', slug: 'aibek-aizada', isGift: true }, APP_URL);
    expect(published).toContain('Айбек &amp; Айзада');
    expect(published).toContain('https://chakyruu.kg/aibek-aizada');
    expect(published).toContain('белек');
  });

  it('masks phone numbers of new users and partner leads', () => {
    const user = formatAdminMessage({ type: 'user_registered', phone: '+996700123456' }, APP_URL);
    expect(user).toContain('+996*******56');
    expect(user).not.toContain('700123456');

    const lead = formatAdminMessage(
      { type: 'partner_lead', orgType: 'VENUE', name: 'Асан', venueName: 'Ала-Тоо', city: null, phone: '+996555000111' },
      APP_URL,
    );
    expect(lead).toContain('Ала-Тоо');
    expect(lead).toContain('+996*******11');
    expect(lead).not.toContain('555000111');
  });

  it('shows a masked e-mail for people who signed up with Google', () => {
    const message = formatAdminMessage({ type: 'user_registered', phone: null, email: 'aizada@gmail.com' }, APP_URL);
    expect(message).toContain('Google: a***@gmail.com');
    expect(message).not.toContain('aizada@');
  });

  it('escapes HTML in user-provided text so Telegram renders it literally', () => {
    const lead = formatAdminMessage(
      { type: 'partner_lead', orgType: 'TAMADA', name: '<b>x</b>', venueName: 'A & B', city: '<i>', phone: '+996555000111' },
      APP_URL,
    );
    expect(lead).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(lead).toContain('A &amp; B');
    expect(lead).not.toContain('<b>x</b>');
  });

  it('explains SMS gateway problems with the admin hint', () => {
    const text = formatAdminMessage({ type: 'sms_problem', kind: 'funds', hint: 'top up the balance' }, APP_URL);
    expect(text).toContain('funds');
    expect(text).toContain('top up the balance');
  });
});

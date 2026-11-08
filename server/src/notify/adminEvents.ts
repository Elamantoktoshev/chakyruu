import type { OrgType } from '@chakyruu/shared';
import { maskPhone } from '../auth/sms.js';

/** Things the site owner wants to hear about right away (sent to Telegram). */
export type AdminEvent =
  | { type: 'user_registered'; phone: string | null; email?: string | null }
  | { type: 'payment_pending'; amountSom: number; reference: string; comment: string; method: string; description: string }
  | { type: 'payment_succeeded'; amountSom: number; method: string; description: string }
  | { type: 'invitation_published'; hostNames: string; slug: string; isGift: boolean }
  | { type: 'partner_lead'; orgType: OrgType; name: string; venueName: string; city: string | null; phone: string }
  | { type: 'sms_problem'; kind: string; hint: string };

export type AdminEventType = AdminEvent['type'];

/** a***@gmail.com — enough to recognise, not enough to spam. */
function maskEmail(email: string | null): string {
  if (!email) return 'e-mail жок';
  const [local = '', domain = ''] = email.split('@');
  return html(`${local.slice(0, 1)}***@${domain}`);
}

const ORG_LABELS: Readonly<Record<OrgType, string>> = { VENUE: 'Тойкана', TAMADA: 'Тамада', AGENCY: 'Агенттик' };

const HTML_ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
/** Telegram HTML mode: anything typed by users must be escaped. */
const html = (value: string): string => value.replace(/[&<>"]/g, (char) => HTML_ESCAPES[char] ?? char);

const som = (amount: number): string => `${amount.toLocaleString('ru-RU')} сом`;

/** Telegram message (HTML) for one event. Phones are masked: the full number is in /admin. */
export function formatAdminMessage(event: AdminEvent, appUrl: string): string {
  const base = appUrl.replace(/\/+$/, '');
  switch (event.type) {
    case 'payment_pending':
      return [
        '💰 <b>Төлөм ырастоону күтүүдө</b>',
        `${som(event.amountSom)} · ${html(event.method)} · код <code>${html(event.reference)}</code>`,
        `Комментарий: <b>${html(event.comment)}</b>`,
        html(event.description),
        `MBank'та текшерип, ырастаңыз: ${base}/admin`,
      ].join('\n');
    case 'payment_succeeded':
      return ['✅ <b>Төлөм өттү</b>', `${som(event.amountSom)} · ${html(event.method)}`, html(event.description)].join('\n');
    case 'invitation_published':
      return [
        `🎉 <b>Чакыруу жарыяланды</b>${event.isGift ? ' (белек код менен)' : ''}`,
        html(event.hostNames),
        `${base}/${encodeURIComponent(event.slug)}`,
      ].join('\n');
    case 'user_registered':
      return `👤 <b>Жаңы колдонуучу</b>\n${event.phone ? maskPhone(event.phone) : `Google: ${maskEmail(event.email ?? null)}`}`;
    case 'partner_lead':
      return [
        `🤝 <b>Жаңы өтүнмө: ${ORG_LABELS[event.orgType]}</b>`,
        `${html(event.venueName)} — ${html(event.name)}${event.city ? `, ${html(event.city)}` : ''}`,
        `${maskPhone(event.phone)} · толук номер: ${base}/admin`,
      ].join('\n');
    case 'sms_problem':
      return [`⚠️ <b>SMS жөнөтүлбөй жатат</b> (${html(event.kind)})`, html(event.hint)].join('\n');
  }
}

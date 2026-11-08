/** Names longer than this are cut so the whole comment fits a bank transfer comment field. */
export const TRANSFER_COMMENT_MAX_NAME = 60;

const BISHKEK_DATE = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Bishkek', day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * What the payer writes in the MBank transfer comment: names and a day they know by heart
 * ("Айбек & Айзада 15.06.2027") instead of a code. The admin matches it to the pending payment.
 */
export function transferComment(name: string, day: Date): string {
  const cleanName = name.replace(/\s+/g, ' ').trim().slice(0, TRANSFER_COMMENT_MAX_NAME).trim();
  const date = BISHKEK_DATE.format(day);
  return cleanName ? `${cleanName} ${date}` : date;
}

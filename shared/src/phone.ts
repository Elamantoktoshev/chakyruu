/** Kyrgyz mobile number in strict E.164 form: +996 followed by exactly 9 digits. */
export const PHONE_PATTERN = /^\+996\d{9}$/;
export const PHONE_PREFIX = '+996';
export const PHONE_LOCAL_DIGITS = 9;


export function isValidPhone(phone: string): boolean {
  return PHONE_PATTERN.test(phone);
}

const COUNTRY_CODE = '996';
const TRUNK_PREFIX = '0';

/**
 * The 9 digits typed after the fixed "+996" prefix. People also paste the whole number
 * ("+996 700 …", "996700…", "0700…"), so the country code or the leading 0 is stripped first.
 */
export function sanitizeLocalPart(input: string): string {
  const digits = input.replace(/\D/g, '');
  const local =
    digits.length > PHONE_LOCAL_DIGITS && digits.startsWith(COUNTRY_CODE)
      ? digits.slice(COUNTRY_CODE.length)
      : digits.length > PHONE_LOCAL_DIGITS && digits.startsWith(TRUNK_PREFIX)
        ? digits.slice(TRUNK_PREFIX.length)
        : digits;
  return local.slice(0, PHONE_LOCAL_DIGITS);
}

export function toE164(localPart: string): string {
  return `${PHONE_PREFIX}${localPart}`;
}

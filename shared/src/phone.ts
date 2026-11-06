import { z } from 'zod';

/** Kyrgyz mobile number in strict E.164 form: +996 followed by exactly 9 digits. */
export const PHONE_PATTERN = /^\+996\d{9}$/;
export const PHONE_PREFIX = '+996';
export const PHONE_LOCAL_DIGITS = 9;

export const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE_PATTERN, 'Phone must be in the format +996XXXXXXXXX');

export function isValidPhone(phone: string): boolean {
  return PHONE_PATTERN.test(phone);
}

/** Keeps only digits and caps the length of the part typed after +996. */
export function sanitizeLocalPart(input: string): string {
  return input.replace(/\D/g, '').slice(0, PHONE_LOCAL_DIGITS);
}

export function toE164(localPart: string): string {
  return `${PHONE_PREFIX}${localPart}`;
}

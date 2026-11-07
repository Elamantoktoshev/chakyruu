import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client';
import { dictionaries } from '../i18n/dict';
import { requestErrorMessage, verifyErrorMessage } from './loginErrors';

const t = dictionaries.KY;

describe('requestErrorMessage', () => {
  it('tells the user the code was not sent when SMS delivery fails (503)', () => {
    expect(requestErrorMessage(new ApiError(503, 'x'), t)).toBe('Код жөнөтүлгөн жок, кайра аракет кылыңыз.');
    expect(requestErrorMessage(new ApiError(503, 'x'), dictionaries.RU)).toBe(dictionaries.RU.errorSmsFailed);
  });

  it('maps validation and rate-limit errors, and falls back to the generic message', () => {
    expect(requestErrorMessage(new ApiError(400, 'x'), t)).toBe(t.errorPhone);
    expect(requestErrorMessage(new ApiError(429, 'x'), t)).toBe(t.errorTooMany);
    expect(requestErrorMessage(new ApiError(500, 'x'), t)).toBe(t.errorGeneric);
    expect(requestErrorMessage(new TypeError('offline'), t)).toBe(t.errorGeneric);
  });
});

describe('verifyErrorMessage', () => {
  it('maps wrong code and too many attempts', () => {
    expect(verifyErrorMessage(new ApiError(400, 'x'), t)).toBe(t.errorCode);
    expect(verifyErrorMessage(new ApiError(429, 'x'), t)).toBe(t.errorTooManyAttempts);
    expect(verifyErrorMessage(new ApiError(503, 'x'), t)).toBe(t.errorGeneric);
  });
});

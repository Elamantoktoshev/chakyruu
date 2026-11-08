import { describe, expect, it } from 'vitest';
import { TRANSFER_COMMENT_MAX_NAME, transferComment } from './transferComment.js';

describe('transferComment', () => {
  it('is the names and the day of the toy, as people would write it', () => {
    expect(transferComment('Айбек & Айзада', new Date('2027-06-15T11:00:00.000Z'))).toBe('Айбек & Айзада 15.06.2027');
  });

  it('uses the Bishkek calendar day, not UTC', () => {
    // 20:30 UTC on 14 June is already 15 June in Bishkek (UTC+6).
    expect(transferComment('Асан', new Date('2027-06-14T20:30:00.000Z'))).toBe('Асан 15.06.2027');
  });

  it('collapses extra spaces and line breaks people may have typed', () => {
    expect(transferComment('  Айбек \n &   Айзада ', new Date('2027-06-15T11:00:00.000Z'))).toBe('Айбек & Айзада 15.06.2027');
  });

  it('shortens very long names so the bank accepts the comment', () => {
    const comment = transferComment('А'.repeat(200), new Date('2027-06-15T11:00:00.000Z'));
    expect(comment).toBe(`${'А'.repeat(TRANSFER_COMMENT_MAX_NAME)} 15.06.2027`);
  });

  it('still gives the date when the name is empty', () => {
    expect(transferComment('   ', new Date('2027-06-15T11:00:00.000Z'))).toBe('15.06.2027');
  });
});

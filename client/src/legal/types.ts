import type { Language } from '../api/types';

export interface LegalSection {
  heading: string;
  paragraphs: readonly string[];
}

/** A legal page in one language. "[ЗАПОЛНИТЬ: …]" marks data only the owner can provide. */
export interface LegalDoc {
  title: string;
  /** Shown under the title. */
  updated: string;
  sections: readonly LegalSection[];
}

export type LegalTexts = Readonly<Record<Language, LegalDoc>>;

/** Placeholders the owner must replace before launch (highlighted on the page). */
export const PLACEHOLDER = /\[ЗАПОЛНИТЬ:[^\]]*\]/g;
export const PLACEHOLDER_START = '[ЗАПОЛНИТЬ:';

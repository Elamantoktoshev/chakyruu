import { Fragment, type ReactNode } from 'react';
import { AppHeader } from '../components/AppHeader';
import { SiteFooter } from '../components/landing/SiteFooter';
import { useI18n } from '../i18n/LanguageContext';
import { CONTACTS } from '../legal/contacts';
import { OFFER } from '../legal/offer';
import { PRIVACY } from '../legal/privacy';
import { PLACEHOLDER, PLACEHOLDER_START, type LegalTexts } from '../legal/types';

export type LegalKind = 'offer' | 'privacy' | 'contacts';

const DOCS: Readonly<Record<LegalKind, LegalTexts>> = { offer: OFFER, privacy: PRIVACY, contacts: CONTACTS };

/** "[ЗАПОЛНИТЬ: …]" stands out so no placeholder survives to launch unnoticed. */
function withPlaceholders(text: string): ReactNode {
  const parts = text.split(new RegExp(`(${PLACEHOLDER.source})`, 'g'));
  return parts.map((part, index) =>
    part.startsWith(PLACEHOLDER_START) ? (
      <mark key={index} className="rounded bg-amber-100 px-1 text-amber-900">
        {part}
      </mark>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

/** Offer, privacy policy and contacts in the visitor's language. */
export function LegalPage({ kind }: { kind: LegalKind }) {
  const { lang } = useI18n();
  const doc = DOCS[kind][lang];
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        <h1 className="font-display font-extrabold text-4xl text-night">{doc.title}</h1>
        {doc.updated && <p className="mt-2 text-sm text-night/55">{withPlaceholders(doc.updated)}</p>}
        <div className="mt-8 space-y-8">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display font-extrabold text-2xl text-night">{section.heading}</h2>
              <div className="mt-3 space-y-2 leading-relaxed text-night/80">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{withPlaceholders(paragraph)}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

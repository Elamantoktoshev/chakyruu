import { Mountains } from '../../components/art/Mountains';
import { HeroText } from '../parts/HeroText';
import { heroHeight } from '../parts/heroSize';
import { InvitationBody } from '../parts/InvitationBody';
import { TemplateFooter } from '../parts/TemplateFooter';
import { usePhoto } from '../parts/usePhoto';
import type { TemplateProps } from '../types';

/** Divider: a small ridge with the rising sun. */
const Ridge = () => (
  <svg viewBox="0 0 120 24" className="mx-auto mb-6 h-6 w-28 text-burgundy" aria-hidden="true">
    <circle cx="74" cy="14" r="5" fill="var(--color-gold)" />
    <path d="M0 22 L30 8 L48 16 L66 4 L88 18 L104 10 L120 22 Z" fill="currentColor" opacity="0.6" />
  </svg>
);

/** Үйлөнүү той — Ала-Тоо: mountains at dawn, the couple's photo rising like the sun. */
export default function AlaToo({ invitation, mode, slots }: TemplateProps) {
  const photo = usePhoto(invitation.photoUrl, mode);
  return (
    <div className="bg-cream text-ink">
      <header className={`relative overflow-hidden ${heroHeight(mode)}`}>
        <Mountains className="absolute inset-0 h-full w-full" />
        <div className="relative flex h-full flex-col items-center justify-start px-6 pt-12 text-center text-white">
          {photo.src && (
            <img
              {...photo.props}
              alt={invitation.hostNames}
              className="mb-6 h-32 w-32 rounded-full border-4 border-white/80 object-cover shadow-xl"
            />
          )}
          <HeroText invitation={invitation} greeting={slots.greeting} namesClassName="text-5xl font-bold drop-shadow-md" />
        </div>
      </header>
      <InvitationBody invitation={invitation} mode={mode} slots={slots} divider={<Ridge />} />
      <TemplateFooter invitation={invitation} decoration={<Ridge />} />
    </div>
  );
}

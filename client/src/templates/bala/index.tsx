import { MoonStars } from '../../components/art/Patterns';
import { HeroText } from '../parts/HeroText';
import { InvitationBody } from '../parts/InvitationBody';
import { TemplateFooter } from '../parts/TemplateFooter';
import { usePhoto } from '../parts/usePhoto';
import type { TemplateProps } from '../types';

const Stars = () => (
  <p className="mb-5 text-xl tracking-[0.6em] text-gold" aria-hidden="true">
    ✦ ✧ ✦
  </p>
);

/** Бешик той — Бала: a calm night sky over the cradle; blue for a boy, pink for a girl. */
export default function Bala({ invitation, mode, slots }: TemplateProps) {
  const photo = usePhoto(invitation.photoUrl, mode);
  return (
    <div className="bg-cream text-ink">
      <header className="relative overflow-hidden bg-burgundy px-6 pb-16 pt-10 text-center text-white">
        <MoonStars className="mx-auto h-28 w-48" />
        {photo.src && (
          <img
            {...photo.props}
            alt={invitation.hostNames}
            className="mx-auto mt-6 h-40 w-40 rounded-full border-4 border-dashed border-gold object-cover"
          />
        )}
        <HeroText invitation={invitation} greeting={slots.greeting} className="mt-6" namesClassName="text-5xl font-bold" />
        {/* soft wave into the page */}
        <svg viewBox="0 0 400 40" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-px h-10 w-full" aria-hidden="true">
          <path d="M0 40 V20 Q100 0 200 20 T400 20 V40 Z" fill="var(--color-cream)" />
        </svg>
      </header>
      <InvitationBody invitation={invitation} mode={mode} slots={slots} divider={<Stars />} altSectionClassName="bg-gold/10" />
      <TemplateFooter invitation={invitation} decoration={<Stars />} />
    </div>
  );
}

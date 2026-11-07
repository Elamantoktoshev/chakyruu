import { OyuMedallion } from '../../components/art/Patterns';
import { HeroText } from '../parts/HeroText';
import { InvitationBody } from '../parts/InvitationBody';
import { TemplateFooter } from '../parts/TemplateFooter';
import { usePhoto } from '../parts/usePhoto';
import type { TemplateProps } from '../types';

const GoldRule = () => <div className="mx-auto mb-6 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" aria-hidden="true" />;

/** Маараке — Юбилей: dark, gold, the age in huge numerals. */
export default function Yubiley({ invitation, mode, slots }: TemplateProps) {
  const photo = usePhoto(invitation.photoUrl, mode);
  return (
    <div className="bg-cream text-ink">
      <header className="relative px-6 pb-12 pt-10 text-center">
        <div className="pointer-events-none absolute inset-4 border border-gold/50" aria-hidden="true" />
        {invitation.heroNumber ? (
          <p className="bg-gradient-to-b from-gold-light to-burgundy bg-clip-text font-serif text-[9rem] font-bold leading-none text-transparent">
            {invitation.heroNumber}
          </p>
        ) : (
          <OyuMedallion className="mx-auto h-32 w-32 text-burgundy" />
        )}
        {photo.src && (
          <img
            {...photo.props}
            alt={invitation.hostNames}
            className="mx-auto mt-4 h-36 w-36 rounded-full border-2 border-burgundy object-cover"
          />
        )}
        <HeroText invitation={invitation} greeting={slots.greeting} className="mt-6 text-burgundy" namesClassName="text-4xl font-bold" />
      </header>
      <InvitationBody invitation={invitation} mode={mode} slots={slots} divider={<GoldRule />} altSectionClassName="bg-surface/60" />
      <TemplateFooter invitation={invitation} className="bg-surface text-burgundy" decoration={<GoldRule />} />
    </div>
  );
}

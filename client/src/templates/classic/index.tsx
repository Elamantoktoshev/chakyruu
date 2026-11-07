import { OrnamentBand } from '../../components/Ornament';
import { OyuMedallion } from '../../components/art/Patterns';
import { HeroText } from '../parts/HeroText';
import { heroHeight } from '../parts/heroSize';
import { InvitationBody } from '../parts/InvitationBody';
import { TemplateFooter } from '../parts/TemplateFooter';
import { usePhoto } from '../parts/usePhoto';
import type { TemplateProps } from '../types';

/** Үйлөнүү той — Классика: photo or ою medallion on bordo, gold ornament bands. */
export default function Classic({ invitation, mode, slots }: TemplateProps) {
  const photo = usePhoto(invitation.photoUrl, mode);
  return (
    <div className="bg-cream text-ink">
      <header className={`relative overflow-hidden ${heroHeight(mode)}`}>
        {photo.src ? (
          <img {...photo.props} alt={invitation.hostNames} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-start justify-center bg-burgundy pt-8">
            <OyuMedallion className="h-28 w-28 text-gold opacity-80" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-burgundy/30 via-burgundy/10 to-burgundy/95" />
        <HeroText
          invitation={invitation}
          greeting={slots.greeting}
          className="absolute inset-x-0 bottom-0 px-6 pb-10 text-center text-white"
          namesClassName="text-5xl font-bold drop-shadow"
        />
      </header>
      <div className="bg-burgundy py-1">
        <OrnamentBand />
      </div>
      <InvitationBody invitation={invitation} mode={mode} slots={slots} />
      <TemplateFooter invitation={invitation} decoration={<OrnamentBand />} />
    </div>
  );
}

import { OrnamentBand } from '../../components/Ornament';
import { KyrgyzStar } from '../../components/art/Patterns';
import { HeroText } from '../parts/HeroText';
import { heroHeight } from '../parts/heroSize';
import { InvitationBody } from '../parts/InvitationBody';
import { TemplateFooter } from '../parts/TemplateFooter';
import { usePhoto } from '../parts/usePhoto';
import type { TemplateProps } from '../types';

const StarDivider = () => (
  <div className="mb-6 flex items-center justify-center gap-3" aria-hidden="true">
    <span className="h-px w-12 bg-gold" />
    <KyrgyzStar className="h-6 w-6" />
    <span className="h-px w-12 bg-gold" />
  </div>
);

/** Сүннөт той — Баатыр: deep navy, a gold 8-pointed star, strong uppercase typography. */
export default function Batyr({ invitation, mode, slots }: TemplateProps) {
  const photo = usePhoto(invitation.photoUrl);
  return (
    <div className="bg-cream text-ink">
      <header className={`relative flex flex-col items-center justify-center overflow-hidden bg-burgundy px-6 text-center text-white ${heroHeight(mode, 'short')}`}>
        <KyrgyzStar className="pointer-events-none absolute h-[28rem] w-[28rem] opacity-10" />
        {photo.src ? (
          <img src={photo.src} onError={photo.onError} alt={invitation.hostNames} className="relative mb-6 h-36 w-36 border-4 border-gold object-cover" />
        ) : (
          <KyrgyzStar className="relative mb-6 h-20 w-20" />
        )}
        <HeroText invitation={invitation} greeting={slots.greeting} className="relative" namesClassName="text-4xl font-bold uppercase tracking-wider" />
      </header>
      <div className="bg-burgundy py-1">
        <OrnamentBand />
      </div>
      <InvitationBody invitation={invitation} mode={mode} slots={slots} divider={<StarDivider />} />
      <TemplateFooter invitation={invitation} decoration={<OrnamentBand />} />
    </div>
  );
}

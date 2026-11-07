import { OrnamentDivider } from '../../components/Ornament';
import { ShyrdakBackground, ShyrdakStrip } from '../../components/art/Patterns';
import { HeroText } from '../parts/HeroText';
import { InvitationBody } from '../parts/InvitationBody';
import { TemplateFooter } from '../parts/TemplateFooter';
import { usePhoto } from '../parts/usePhoto';
import type { TemplateProps } from '../types';

/** Универсалдуу — Шырдак: felt texture with ram-horn tiles framing a cream card. */
export default function Shyrdak({ invitation, mode, slots }: TemplateProps) {
  const photo = usePhoto(invitation.photoUrl);
  return (
    <div className="bg-cream text-ink">
      <header className="relative overflow-hidden px-5 py-10">
        <ShyrdakBackground className="absolute inset-0 h-full w-full" />
        <div className="relative rounded-3xl border-4 border-gold bg-cream px-6 py-10 text-center text-burgundy shadow-2xl">
          {photo.src && (
            <img src={photo.src} onError={photo.onError} alt={invitation.hostNames} className="mx-auto mb-6 h-44 w-44 rounded-2xl object-cover" />
          )}
          <HeroText invitation={invitation} greeting={slots.greeting} namesClassName="text-5xl font-bold" />
        </div>
      </header>
      <InvitationBody invitation={invitation} mode={mode} slots={slots} divider={<OrnamentDivider className="mb-6" />} />
      <ShyrdakStrip />
      <TemplateFooter invitation={invitation} />
    </div>
  );
}

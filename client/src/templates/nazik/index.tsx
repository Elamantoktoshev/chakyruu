import { FlowerCorner } from '../../components/art/Patterns';
import { HeroText } from '../parts/HeroText';
import { InvitationBody } from '../parts/InvitationBody';
import { TemplateFooter } from '../parts/TemplateFooter';
import { usePhoto } from '../parts/usePhoto';
import type { TemplateProps } from '../types';

const Bloom = () => <FlowerCorner className="mx-auto mb-4 h-10 w-10 rotate-45" />;

/** Кыз узатуу — Назик: powder tones, flower garlands, the bride's photo in an oval frame. */
export default function Nazik({ invitation, mode, slots }: TemplateProps) {
  const photo = usePhoto(invitation.photoUrl, mode);
  return (
    <div className="relative overflow-hidden bg-cream text-ink">
      <FlowerCorner className="pointer-events-none absolute -left-4 -top-4 h-40 w-40 -scale-x-100 rotate-180 opacity-90" />
      <FlowerCorner className="pointer-events-none absolute -right-4 -top-4 h-40 w-40 rotate-90 opacity-90" />
      <header className="relative px-8 pb-12 pt-20 text-center">
        {photo.src && (
          <div className="mx-auto mb-8 w-56 rounded-[50%] border-2 border-gold p-1.5">
            <img {...photo.props} alt={invitation.hostNames} className="h-72 w-full rounded-[50%] object-cover" />
          </div>
        )}
        <HeroText invitation={invitation} greeting={slots.greeting} className="text-burgundy" namesClassName="text-5xl italic" />
      </header>
      <InvitationBody invitation={invitation} mode={mode} slots={slots} divider={<Bloom />} altSectionClassName="bg-gold/10" />
      <TemplateFooter invitation={invitation} className="bg-cream-dark text-burgundy" decoration={<Bloom />} />
    </div>
  );
}

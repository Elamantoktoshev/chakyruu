import { HeroText } from '../parts/HeroText';
import { InvitationBody } from '../parts/InvitationBody';
import { TemplateFooter } from '../parts/TemplateFooter';
import { usePhoto } from '../parts/usePhoto';
import type { TemplateProps } from '../types';

const Hairline = () => <div className="mx-auto mb-8 h-px w-16 bg-gold" aria-hidden="true" />;

/** Үйлөнүү той — Минимализм: white space, an arched photo, thin hairlines, no ornament. */
export default function Minimal({ invitation, mode, slots }: TemplateProps) {
  const photo = usePhoto(invitation.photoUrl, mode);
  return (
    <div className="bg-cream text-ink">
      <header className="px-8 pb-12 pt-16 text-center">
        {photo.src && (
          <img
            {...photo.props}
            alt={invitation.hostNames}
            className="mx-auto mb-10 h-72 w-56 rounded-t-full object-cover shadow-sm"
          />
        )}
        <HeroText
          invitation={invitation}
          greeting={slots.greeting}
          className="text-burgundy"
          namesClassName="text-5xl font-normal italic tracking-tight"
        />
        <div className="mx-auto mt-10 h-16 w-px bg-gold" aria-hidden="true" />
      </header>
      <InvitationBody
        invitation={invitation}
        mode={mode}
        slots={slots}
        divider={<Hairline />}
        altSectionClassName="border-y border-gold/20"
        labelClassName="text-[11px] uppercase tracking-[0.45em] text-ink/50"
        valueClassName="font-serif text-ink"
      />
      <TemplateFooter invitation={invitation} className="border-t border-gold/30 bg-cream text-ink" />
    </div>
  );
}

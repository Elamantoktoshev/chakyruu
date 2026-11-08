import { assetUrl, manifestOf } from '@chakyruu/shared';
import { LayerImage } from '../../openings/layered/LayerImage';
import { HeroText } from '../parts/HeroText';
import { heroHeight } from '../parts/heroSize';
import { InvitationBody } from '../parts/InvitationBody';
import { TemplateFooter } from '../parts/TemplateFooter';
import { usePhoto } from '../parts/usePhoto';
import Classic from '../classic';
import type { InvitationViewMode, TemplateProps } from '../types';

/**
 * Every illustrated template: the artwork and colours come from the manifest in Template.config,
 * the content blocks are the shared ones. A broken manifest falls back to Classic.
 */
export default function Illustrated(props: TemplateProps) {
  const { invitation, mode, slots } = props;
  const manifest = manifestOf(invitation.template.config);
  if (!manifest) return <Classic {...props} />;

  const { palette } = manifest;
  const background = assetUrl(manifest, 'bg.webp');
  return (
    <div className="bg-cream text-ink">
      <header className={`relative overflow-hidden ${heroHeight(mode)}`}>
        <LayerImage
          src={assetUrl(manifest, 'cover.webp')}
          label={invitation.template.name}
          palette={palette}
          blurDataUrl={manifest.placeholders['cover.webp']}
          isFill
          isEager={mode !== 'thumbnail'}
        />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: `linear-gradient(to bottom, transparent 35%, ${palette.primary}e6 92%)` }}
          aria-hidden="true"
        />
        <HeroText
          invitation={invitation}
          greeting={slots.greeting}
          className="absolute inset-x-0 bottom-0 px-6 pb-10 text-center text-white"
          namesClassName="text-5xl font-bold drop-shadow-lg"
        />
      </header>
      {/* Page background artwork under a veil of the background colour, so text stays readable. */}
      <div className="relative" style={{ backgroundImage: `url(${background})`, backgroundSize: 'cover', backgroundPosition: 'center top' }}>
        <div className="absolute inset-0 bg-cream/85" aria-hidden="true" />
        <div className="relative">
          <CouplePhoto photoUrl={invitation.photoUrl} alt={invitation.hostNames} mode={mode} frameColor={palette.accent} />
          <InvitationBody invitation={invitation} mode={mode} slots={slots} />
          <TemplateFooter invitation={invitation} />
        </div>
      </div>
    </div>
  );
}

type CouplePhotoProps = {
  photoUrl: string | null;
  alt: string;
  mode: InvitationViewMode;
  frameColor: string;
};

/** The owner's photo in an arch frame of the design's accent colour; nothing when there is no photo. */
function CouplePhoto({ photoUrl, alt, mode, frameColor }: CouplePhotoProps) {
  const photo = usePhoto(photoUrl, mode);
  if (!photo.src) return null;
  return (
    <div className="px-10 pt-10">
      <div className="mx-auto w-full max-w-64 rounded-t-full border-2 p-1.5" style={{ borderColor: frameColor }}>
        <img {...photo.props} alt={alt} className="aspect-[3/4] w-full rounded-t-full object-cover" />
      </div>
    </div>
  );
}

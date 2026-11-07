import { GALLERY_MAX_PHOTOS, MAX_IMAGE_BYTES } from '@chakyruu/shared';
import { useRef, useState, type ChangeEvent } from 'react';
import { ApiError, api } from '../api/client';
import type { GalleryPhoto } from '../api/types';
import { useI18n } from '../i18n/LanguageContext';
import { safeUrl } from '../lib/format';

type Props = {
  invitationId: string;
  photos: readonly GalleryPhoto[];
  onChanged: (photos: GalleryPhoto[]) => void;
};

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';

/** Up to 6 photos: add several at once, remove, move left/right. */
export function GalleryField({ invitationId, photos, onChanged }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const freeSlots = GALLERY_MAX_PHOTOS - photos.length;

  async function run(action: () => Promise<GalleryPhoto[]>) {
    setIsBusy(true);
    setError(null);
    try {
      onChanged(await action());
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 413) setError(t.photoTooLarge);
      else if (err instanceof ApiError && err.status === 400) setError(t.photoBadType);
      else setError(t.errorGeneric);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])].slice(0, freeSlots);
    event.target.value = '';
    if (files.some((file) => file.size > MAX_IMAGE_BYTES)) {
      setError(t.photoTooLarge);
      return;
    }
    // One by one: each response is the full gallery, so the last one wins.
    await run(async () => {
      let latest = [...photos];
      for (const file of files) latest = await api.addGalleryPhoto(invitationId, file);
      return latest;
    });
  }

  function move(index: number, offset: -1 | 1) {
    const ids = photos.map((photo) => photo.id);
    const target = index + offset;
    const reordered = ids.map((id, i) => (i === index ? ids[target] : i === target ? ids[index] : id));
    void run(() => api.reorderGallery(invitationId, reordered));
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-ink/80">{t.fieldGallery}</span>
      <ul className="grid grid-cols-3 gap-2">
        {photos.map((photo, index) => (
          <li key={photo.id} className="relative aspect-square overflow-hidden rounded-xl border border-gold/40 bg-cream-dark">
            <img src={safeUrl(photo.url)} alt="" loading="lazy" className="h-full w-full object-cover" />
            <button
              type="button"
              disabled={isBusy}
              aria-label={t.galleryRemove}
              onClick={() => void run(() => api.removeGalleryPhoto(invitationId, photo.id))}
              className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-graphite/70 text-cream"
            >
              <span aria-hidden="true">×</span>
            </button>
            <div className="absolute inset-x-1 bottom-1 flex justify-between">
              {index > 0 ? <MoveButton label={t.galleryMoveLeft} glyph="‹" disabled={isBusy} onClick={() => move(index, -1)} /> : <span />}
              {index < photos.length - 1 && <MoveButton label={t.galleryMoveRight} glyph="›" disabled={isBusy} onClick={() => move(index, 1)} />}
            </div>
          </li>
        ))}
        {freeSlots > 0 && (
          <li>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-burgundy/40 text-burgundy transition hover:bg-burgundy/5 disabled:opacity-60"
            >
              <span aria-hidden="true" className="text-2xl leading-none">+</span>
              <span className="text-xs font-medium">{isBusy ? t.photoUploading : t.galleryAdd}</span>
            </button>
          </li>
        )}
      </ul>
      <input ref={inputRef} type="file" accept={ACCEPTED_TYPES} multiple className="hidden" onChange={(e) => void handleFiles(e)} />
      {error ? (
        <p role="alert" className="mt-1 text-xs font-medium text-red-700">{error}</p>
      ) : (
        <p className="mt-1 text-xs text-ink/55">{freeSlots > 0 ? t.galleryHint.replace('{n}', String(GALLERY_MAX_PHOTOS)) : t.galleryFull}</p>
      )}
    </div>
  );
}

function MoveButton({ label, glyph, disabled, onClick }: { label: string; glyph: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-cream/90 text-burgundy shadow"
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}

import { MAX_IMAGE_BYTES } from '@chakyruu/shared';
import { useRef, useState, type ChangeEvent } from 'react';
import { api, ApiError } from '../api/client';
import { useI18n } from '../i18n/LanguageContext';
import { safeUrl } from '../lib/format';


const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';

type Props = {
  invitationId: string;
  photoUrl: string | null;
  onUploaded: (photoUrl: string) => void;
};

export function PhotoField({ invitationId, photoUrl, onUploaded }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = safeUrl(photoUrl);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError(t.photoTooLarge);
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const { photoUrl: url } = await api.uploadPhoto(invitationId, file);
      onUploaded(url);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 413) setError(t.photoTooLarge);
      else if (err instanceof ApiError && err.status === 400) setError(t.photoBadType);
      else setError(t.errorGeneric);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-night/80">{t.fieldPhoto}</span>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-line bg-brand-soft">
          {preview && <img src={preview} alt="" className="h-full w-full object-cover" />}
        </div>
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="min-h-11 rounded-xl border-2 border-brand px-5 text-sm font-medium text-brand transition hover:bg-brand hover:text-white disabled:opacity-60"
        >
          {isUploading ? t.photoUploading : preview ? t.photoReplace : t.photoUpload}
        </button>
        <input ref={inputRef} type="file" accept={ACCEPTED_TYPES} className="hidden" onChange={(e) => void handleChange(e)} />
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

import { useRef, useState, type ChangeEvent } from 'react';
import { ApiError } from '../../api/client';
import { useI18n } from '../../i18n/LanguageContext';
import { safeUrl } from '../../lib/format';

const MAX_BYTES = 5 * 1024 * 1024;

type Props = {
  label: string;
  imageUrl: string | null;
  upload: (file: File) => Promise<string>;
  onUploaded: (url: string) => void;
};

/** Square image preview + upload button (logo, tamada photo). */
export function ImageUploadField({ label, imageUrl, upload, onUploaded }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = safeUrl(imageUrl);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError(t.photoTooLarge);
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      onUploaded(await upload(file));
    } catch (err: unknown) {
      setError(err instanceof ApiError && err.status === 400 ? t.photoBadType : t.errorGeneric);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-ink/80">{label}</span>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-gold/50 bg-cream-dark">
          {preview && <img src={preview} alt="" className="h-full w-full object-cover" />}
        </div>
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="min-h-11 rounded-full border-2 border-burgundy px-5 text-sm font-medium text-burgundy disabled:opacity-60"
        >
          {isUploading ? t.photoUploading : preview ? t.photoReplace : t.photoUpload}
        </button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void handleChange(e)} />
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

import { useRef, useState, type ChangeEvent } from 'react';
import { api } from '../../api/client';
import type { AdminTemplateAsset } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';
import { adminErrorText } from './adminErrorText';

type Props = { templateId: string; asset: AdminTemplateAsset; onChanged: () => void };

/** One artwork file of an illustrated design: preview, upload, back to the shipped file. */
export function TemplateAssetSlot({ templateId, asset, onChanged }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMissing, setIsMissing] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setIsBusy(true);
    setError(null);
    try {
      await action();
      setIsMissing(false);
      onChanged();
    } catch (caught: unknown) {
      setError(adminErrorText(caught, t.errorGeneric));
    } finally {
      setIsBusy(false);
    }
  }

  function upload(event: ChangeEvent<HTMLInputElement>) {
    const [file] = event.target.files ?? [];
    event.target.value = '';
    if (file) void run(() => api.admin.uploadTemplateAsset(templateId, asset.file, file));
  }

  function reset() {
    if (window.confirm(t.adminTplResetConfirm)) void run(() => api.admin.removeTemplateAsset(templateId, asset.file));
  }

  return (
    <li className="flex flex-col rounded-2xl border border-line bg-page p-2">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#e6ebe8_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
        {isMissing ? (
          <span className="px-2 text-center text-xs text-muted">{asset.label}</span>
        ) : (
          <img src={asset.url} alt={asset.label} loading="lazy" onError={() => setIsMissing(true)} className="max-h-full max-w-full object-contain" />
        )}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-night" title={asset.file}>{asset.label}</p>
      <p className="truncate text-[11px] text-muted">{asset.file}</p>
      <p className={`mt-1 text-[11px] font-semibold ${asset.isUploaded ? 'text-brand' : 'text-muted'}`}>
        {asset.isUploaded ? t.adminTplUploaded : t.adminTplFromRepo}
      </p>
      {error && <p role="alert" className="mt-1 text-[11px] text-red-700">{error}</p>}
      <div className="mt-2 flex gap-1.5">
        <input ref={inputRef} type="file" accept="image/webp,image/png,image/jpeg" onChange={upload} className="hidden" />
        <button
          type="button"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
          className="min-h-10 flex-1 rounded-lg bg-brand px-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {isBusy ? '…' : t.adminTplUpload}
        </button>
        {asset.isUploaded && (
          <button type="button" disabled={isBusy} onClick={reset} title={t.adminTplReset} aria-label={t.adminTplReset} className="min-h-10 rounded-lg border border-line px-2 text-xs text-night">
            ↺
          </button>
        )}
      </div>
    </li>
  );
}

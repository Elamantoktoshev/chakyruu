import { EVENT_TYPES, TEMPLATE_BADGES, TEMPLATE_PRICE_MAX_SOM, type EventType } from '@chakyruu/shared';
import { useCallback, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { AdminTemplate, AdminTemplatePatch, TemplateBadge } from '../../api/types';
import { useAsync } from '../../api/useAsync';
import { inputClass } from '../../builder/fields';
import { useI18n } from '../../i18n/LanguageContext';
import { ErrorView, LoadingView } from '../StatusView';
import { adminErrorText } from './adminErrorText';
import { TemplateAssetSlot } from './TemplateAssetSlot';

/** /admin → Шаблондор: catalog settings of every design, artwork of the illustrated ones. */
export function TemplatesTab() {
  const load = useCallback(() => api.admin.templates(), []);
  const state = useAsync(load);
  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView error={state.error} onRetry={state.reload} />;
  return (
    <ul className="space-y-4">
      {state.data.map((template) => (
        <TemplateEditor key={template.id} template={template} onChanged={state.reload} />
      ))}
    </ul>
  );
}

function toPatch(form: FormData): AdminTemplatePatch {
  const price = String(form.get('priceSom') ?? '').trim();
  const badge = String(form.get('badge') ?? '');
  return {
    name: String(form.get('name') ?? '').trim(),
    type: String(form.get('type')) as EventType,
    priceSom: price === '' ? null : Number(price),
    badge: badge === '' ? null : (badge as TemplateBadge),
    sortOrder: Number(form.get('sortOrder') ?? 0),
    isActive: form.get('isActive') === 'on',
    description: { ky: String(form.get('descKy') ?? '').trim(), ru: String(form.get('descRu') ?? '').trim() },
  };
}

type EditorProps = { template: AdminTemplate; onChanged: () => void };

function TemplateEditor({ template, onChanged }: EditorProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'saved' } | { kind: 'error'; message: string }>({ kind: 'idle' });
  const labelClass = 'block text-xs font-semibold text-night/70';

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'saving' });
    try {
      await api.admin.updateTemplate(template.id, toPatch(new FormData(event.currentTarget)));
      setStatus({ kind: 'saved' });
      onChanged();
    } catch (error: unknown) {
      setStatus({ kind: 'error', message: adminErrorText(error, t.errorGeneric) });
    }
  }

  return (
    <li className={`rounded-3xl border bg-white p-5 shadow-sm ${template.isActive ? 'border-line' : 'border-dashed border-night/20 opacity-80'}`}>
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="sm:col-span-2">
          <span className={labelClass}>{t.adminTplName}</span>
          <input name="name" defaultValue={template.name} required minLength={2} maxLength={40} className={inputClass} />
        </label>
        <label>
          <span className={labelClass}>{t.adminTplType}</span>
          <select name="type" defaultValue={template.type} className={inputClass}>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>{t.eventTypes[type]}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelClass}>{t.adminTplPrice}</span>
          <input name="priceSom" type="number" inputMode="numeric" min={0} max={TEMPLATE_PRICE_MAX_SOM} defaultValue={template.priceSom ?? ''} className={inputClass} />
        </label>
        <label>
          <span className={labelClass}>{t.adminTplBadge}</span>
          <select name="badge" defaultValue={template.badge ?? ''} className={inputClass}>
            <option value="">{t.adminTplNoBadge}</option>
            {TEMPLATE_BADGES.map((badge) => (
              <option key={badge} value={badge}>{t.tplBadges[badge]}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelClass}>{t.adminTplOrder}</span>
          <input name="sortOrder" type="number" inputMode="numeric" min={0} max={10_000} defaultValue={template.sortOrder} className={inputClass} />
        </label>
        <label className="flex min-h-11 items-center gap-2 self-end sm:col-span-2">
          <input name="isActive" type="checkbox" defaultChecked={template.isActive} className="h-5 w-5 accent-brand" />
          <span className="text-sm font-medium text-night">{t.adminTplActive}</span>
        </label>
        <label className="sm:col-span-2">
          <span className={labelClass}>{t.adminTplDescKy}</span>
          <textarea name="descKy" rows={2} maxLength={160} defaultValue={template.description.ky ?? ''} className={inputClass} />
        </label>
        <label className="sm:col-span-2">
          <span className={labelClass}>{t.adminTplDescRu}</span>
          <textarea name="descRu" rows={2} maxLength={160} defaultValue={template.description.ru ?? ''} className={inputClass} />
        </label>
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
          <button type="submit" disabled={status.kind === 'saving'} className="min-h-11 rounded-xl bg-brand px-5 font-display text-sm font-bold text-white disabled:opacity-60">
            {t.adminTplSave}
          </button>
          {status.kind === 'saved' && <span className="text-sm text-brand">{t.adminTplSaved}</span>}
          {status.kind === 'error' && <span role="alert" className="text-sm text-red-700">{status.message}</span>}
        </div>
      </form>

      <div className="mt-5 border-t border-line pt-4">
        {template.assets.length === 0 ? (
          <p className="text-sm text-muted">{t.adminTplDrawn}</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-night">{t.adminTplAssets}</p>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {template.assets.map((asset) => (
                <TemplateAssetSlot key={asset.file} templateId={template.id} asset={asset} onChanged={onChanged} />
              ))}
            </ul>
          </>
        )}
      </div>
    </li>
  );
}

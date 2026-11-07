import { MAX_PROGRAM_ITEMS, programSchema, readProgram, type ProgramItem } from '@chakyruu/shared';
import { useState } from 'react';
import { useI18n } from '../i18n/LanguageContext';
import { inputClass } from './fields';

type Props = {
  value: unknown;
  /** Called with a valid programme only (incomplete rows are kept locally until filled). */
  onChange: (program: ProgramItem[]) => void;
};

const EMPTY_ROW: ProgramItem = { time: '', title: '' };

/** Optional toi programme: time → event rows. */
export function ProgramEditor({ value, onChange }: Props) {
  const { t } = useI18n();
  const [rows, setRows] = useState<ProgramItem[]>(() => readProgram(value));

  function update(next: ProgramItem[]) {
    setRows(next);
    const complete = next.filter((row) => row.time && row.title.trim());
    if (programSchema.safeParse(complete).success) onChange(complete);
  }

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1.5 text-sm font-medium text-ink/80">{t.fieldProgram}</legend>
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-[6.5rem_1fr_2.75rem] gap-2">
          <input
            type="time"
            aria-label={t.fieldTime}
            value={row.time}
            onChange={(e) => update(rows.map((r, i) => (i === index ? { ...r, time: e.target.value } : r)))}
            className={inputClass}
          />
          <input
            aria-label={t.fieldProgram}
            maxLength={80}
            placeholder={t.programTitlePlaceholder}
            value={row.title}
            onChange={(e) => update(rows.map((r, i) => (i === index ? { ...r, title: e.target.value } : r)))}
            className={inputClass}
          />
          <button
            type="button"
            aria-label={t.deleteGuest}
            onClick={() => update(rows.filter((_, i) => i !== index))}
            className="min-h-12 rounded-xl border border-stone-300 text-stone-500"
          >
            ✕
          </button>
        </div>
      ))}
      {rows.length < MAX_PROGRAM_ITEMS && (
        <button
          type="button"
          onClick={() => setRows([...rows, EMPTY_ROW])}
          className="min-h-11 rounded-full border border-burgundy/40 px-4 text-sm font-medium text-burgundy"
        >
          + {t.programAdd}
        </button>
      )}
    </fieldset>
  );
}

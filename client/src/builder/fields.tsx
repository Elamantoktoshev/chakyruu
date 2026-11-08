import type { ReactNode } from 'react';

export const inputClass =
  'w-full min-h-12 rounded-xl border border-line bg-white/80 px-4 py-3 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 aria-[invalid=true]:border-red-600';

type FieldProps = {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
};

/** Label + control + hint/error, stacked for one-handed mobile use. */
export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-night/80">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="mt-1 block text-xs font-medium text-red-700">
          {error}
        </span>
      ) : (
        hint && <span className="mt-1 block text-xs text-night/55">{hint}</span>
      )}
    </label>
  );
}

type ChoiceProps<T extends string> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
};

/** Pill buttons for a short list of mutually exclusive options. */
export function ChoiceChips<T extends string>({ label, options, value, onChange }: ChoiceProps<T>) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-night/80">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded-xl border px-4 text-sm font-medium transition ${
              value === option.value
                ? 'border-brand bg-brand text-white'
                : 'border-line bg-white/70 text-brand hover:border-brand/60'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

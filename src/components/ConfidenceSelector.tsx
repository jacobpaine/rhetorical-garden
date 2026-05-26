import type { Confidence } from '../types';

const options: { value: Confidence; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function ConfidenceSelector({
  value,
  onChange,
  idPrefix,
}: {
  value: Confidence;
  onChange: (c: Confidence) => void;
  idPrefix: string;
}) {
  return (
    <fieldset className="flex items-center gap-1">
      <legend className="sr-only">Confidence</legend>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            id={`${idPrefix}-${opt.value}`}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
              active
                ? 'bg-ink-900 text-ink-50 dark:bg-ink-50 dark:text-ink-900'
                : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-700 dark:text-ink-200 dark:hover:bg-ink-600'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </fieldset>
  );
}

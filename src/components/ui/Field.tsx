import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
  action?: ReactNode;
}

/** Consistent label + hint wrapper around any input. */
export function Field({ label, hint, children, action }: FieldProps) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3">
        <span className="field-label">{label}</span>
        {action}
      </span>
      <span className="mt-2 block">{children}</span>
      {hint && <span className="mt-1.5 block text-xs leading-relaxed" style={{ color: 'var(--ink-4)' }}>{hint}</span>}
    </label>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  type?: 'text' | 'url' | 'email' | 'date';
  multiline?: boolean;
  rows?: number;
  action?: ReactNode;
}

export function TextField({ label, value, onChange, hint, placeholder, type = 'text', multiline, rows = 4, action }: TextFieldProps) {
  return (
    <Field label={label} hint={hint} action={action}>
      {multiline ? (
        <textarea
          className="input-field resize-y leading-relaxed"
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className="input-field"
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}

export function Switch({ checked, onChange, label, hint }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-left transition"
      style={{ border: '1px solid var(--border-soft)', background: 'var(--bg)' }}
    >
      <span>
        <span className="block text-sm" style={{ color: 'var(--ink)' }}>{label}</span>
        {hint && <span className="mt-0.5 block text-xs" style={{ color: 'var(--ink-4)' }}>{hint}</span>}
      </span>
      <span
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
        style={{ background: checked ? 'var(--moss)' : 'var(--border)' }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
          style={{ left: checked ? '1.375rem' : '.125rem', boxShadow: 'var(--shadow-sm)' }}
        />
      </span>
    </button>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  hint?: string;
}

export function SelectField({ label, value, options, onChange, hint }: SelectFieldProps) {
  return (
    <Field label={label} hint={hint}>
      <select className="input-field" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </Field>
  );
}

// Label + control + hint/error, laid out the same everywhere. The control
// is passed as children and must carry the same `id` as `htmlFor`.

import { ReactNode } from "react";

interface FieldProps {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: ReactNode;
  /** Shown after the label, muted — "optional", a character count, etc. */
  meta?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export default function Field({ label, htmlFor, hint, error, meta, required, children, className = "" }: FieldProps) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="field-label">
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-brand-600">
              *
            </span>
          )}
        </label>
        {meta && <span className="mb-1.5 text-xs text-fg-faint">{meta}</span>}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="field-error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

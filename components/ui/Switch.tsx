"use client";

// An on/off toggle — for settings that take effect as a state (published,
// suggested in the quiz), where a checkbox reads like a form answer.

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name. Pass the visible label's text, or use `labelledBy`. */
  label?: string;
  labelledBy?: string;
  disabled?: boolean;
  id?: string;
}

export default function Switch({ checked, onChange, label, labelledBy, disabled, id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-brand-600" : "bg-line-strong"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-xs ring-1 ring-black/5 transition-transform duration-200 ${
          checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

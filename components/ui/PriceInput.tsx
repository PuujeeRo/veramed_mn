"use client";

// ₮ amount input: digits only, shown with thousands separators while
// typing ("45,000"), stored as a plain integer. A bare <input type=number>
// shows "45000", accepts "e" and "-", and changes value on scroll-wheel.

import { useState } from "react";

interface PriceInputProps {
  id: string;
  value: number;
  onChange: (value: number) => void;
  invalid?: boolean;
  describedBy?: string;
}

const format = (n: number) => (n ? n.toLocaleString("en-US") : "");

export default function PriceInput({ id, value, onChange, invalid, describedBy }: PriceInputProps) {
  // Local text so an in-progress edit (e.g. a cleared field) isn't
  // overwritten by re-formatting the parent's number on every keystroke.
  const [text, setText] = useState(format(value));

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-fg-muted">
        ₮
      </span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={text}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
          const n = digits ? Number(digits) : 0;
          setText(digits ? format(n) : "");
          onChange(n);
        }}
        className={`field pl-7 tabular-nums ${invalid ? "field-invalid" : ""}`}
      />
    </div>
  );
}

"use client";

// "Are you sure?" for actions that can't be undone. Escape or the backdrop
// cancels; focus starts on Cancel, so a stray Enter never confirms.

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { FiAlertTriangle } from "react-icons/fi";
import Spinner from "../Spinner";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, busy, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-overlay flex items-end justify-center p-4 sm:items-center">
      <div aria-hidden="true" onClick={() => !busy && onCancel()} className="absolute inset-0 bg-black/40 backdrop-blur-[2px] motion-safe:animate-fade-in" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-xl border border-line bg-surface p-5 shadow-pop motion-safe:animate-pop-in sm:p-6"
      >
        <div className="flex gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600">
            <FiAlertTriangle size={18} />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-fg">
              {title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{body}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy} className="btn-secondary">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="btn-danger">
            {busy && <Spinner className="h-4 w-4 text-white" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

"use client";

// A panel that slides in from the right over the current page — for a
// short task (add a product) that shouldn't navigate away from the list it
// belongs to. Escape or the backdrop closes it; page scroll is locked
// while it's open; focus moves into it and returns to the opener after.

import { ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel: string;
}

export default function Drawer({ open, onClose, title, description, children, footer, closeLabel }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // First focusable field, not the close button.
    const first = panelRef.current?.querySelector<HTMLElement>("input, textarea, select, [data-autofocus]");
    (first ?? panelRef.current)?.focus();
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-overlay">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] motion-safe:animate-fade-in"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-surface shadow-pop focus:outline-none motion-safe:animate-slide-in-right"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-fg">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm leading-relaxed text-fg-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={closeLabel} className="icon-btn -mr-1.5">
            <FiX size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-line bg-subtle/50 px-5 py-3 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}

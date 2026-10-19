"use client";

// A small dropdown of actions behind one button — row actions in a table,
// secondary actions in a page header. Closes on outside click, Escape, or
// choosing an item; arrow keys move between items.

import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { IconType } from "react-icons";

export interface MenuItem {
  label: string;
  icon?: IconType;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface MenuProps {
  /** Contents of the trigger button. */
  trigger: ReactNode;
  /** Accessible name for the trigger (it is often icon-only). */
  label: string;
  items: MenuItem[];
  align?: "left" | "right";
  /** Opens below the trigger (default) or above it, for triggers at the bottom of the screen. */
  side?: "down" | "up";
  triggerClassName?: string;
}

export default function Menu({
  trigger,
  label,
  items,
  align = "right",
  side = "down",
  triggerClassName = "icon-btn",
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    // Focus the first item so the menu is usable from the keyboard.
    listRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onListKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? (i + 1) % buttons.length : (i - 1 + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          ref={listRef}
          id={menuId}
          role="menu"
          onKeyDown={onListKey}
          className={`absolute z-menu min-w-[12rem] rounded-lg border border-line bg-surface p-1 shadow-pop motion-safe:animate-pop-in ${
            side === "up" ? "bottom-full mb-1.5 origin-bottom" : "top-full mt-1.5 origin-top"
          } ${align === "right" ? "right-0" : "left-0"}`}
        >
          {items.map(({ label: itemLabel, icon: Icon, onSelect, danger, disabled }) => (
            <button
              key={itemLabel}
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onSelect();
              }}
              className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition focus:outline-none disabled:pointer-events-none disabled:opacity-40 ${
                danger
                  ? "text-red-600 hover:bg-red-500/10 focus:bg-red-500/10 dark:text-red-400"
                  : "text-fg hover:bg-subtle focus:bg-subtle"
              }`}
            >
              {Icon && <Icon size={15} className={`shrink-0 ${danger ? "" : "text-fg-muted"}`} />}
              {itemLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

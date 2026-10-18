"use client";

// The save control for every whole-form editor. Instead of a Save button
// that is always there (and says nothing about whether anything changed),
// this bar slides up from the bottom the moment the form differs from what
// was last saved, and leaves again once it's saved or discarded.
//
// While the form is dirty it also:
//   - saves on Ctrl/Cmd+S,
//   - asks before the tab is closed or reloaded (beforeunload).
// In-app link clicks are not intercepted: the dashboard's links are few and
// obvious, and a custom "leave page?" dialog on every one is more annoying
// than the risk it guards against.

import { useEffect } from "react";
import { FiAlertCircle } from "react-icons/fi";
import { useLanguage } from "@/lib/i18n";
import Spinner from "../Spinner";

interface UnsavedBarProps {
  dirty: boolean;
  saving: boolean;
  /** Last save failed — the bar stays up and says so. */
  error?: boolean;
  /** Something blocks saving (a required field is empty) — explains why. */
  blockedReason?: string;
  onSave: () => void;
  onDiscard: () => void;
}

export default function UnsavedBar({ dirty, saving, error, blockedReason, onSave, onDiscard }: UnsavedBarProps) {
  const { t } = useLanguage();
  const visible = dirty || saving;

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && !blockedReason) onSave();
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("keydown", onKey);
    };
  }, [dirty, saving, blockedReason, onSave]);

  return (
    <>
      {/* Keeps the end of the form from sitting underneath the bar. */}
      <div aria-hidden="true" className={visible ? "h-20" : "h-0"} />
      <div
        className={`fixed inset-x-0 bottom-0 z-sticky px-3 pb-3 transition-[transform,opacity] duration-200 lg:left-64 sm:px-6 sm:pb-5 ${
          visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        }`}
        aria-hidden={!visible}
      >
        <div
          role="region"
          aria-label={t("save.region")}
          className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-line bg-surface/95 px-4 py-3 shadow-pop backdrop-blur"
        >
          <p className="flex min-w-0 items-center gap-2 text-sm">
            {error ? (
              <>
                <FiAlertCircle size={16} className="shrink-0 text-red-500" />
                <span className="font-medium text-red-600 dark:text-red-400">{t("common.saveError")}</span>
              </>
            ) : blockedReason ? (
              <>
                <FiAlertCircle size={16} className="shrink-0 text-amber-500" />
                <span className="text-fg-muted">{blockedReason}</span>
              </>
            ) : (
              <>
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                <span className="font-medium text-fg">{t("save.unsaved")}</span>
                <span className="hidden items-center gap-1 text-xs text-fg-faint sm:inline-flex">
                  <span className="kbd">Ctrl</span>
                  <span className="kbd">S</span>
                </span>
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onDiscard} disabled={saving} className="btn-ghost btn-sm">
              {t("save.discard")}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || Boolean(blockedReason)}
              className="btn-primary btn-sm min-w-[6.5rem]"
            >
              {saving && <Spinner className="h-3.5 w-3.5 text-white" />}
              {saving ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

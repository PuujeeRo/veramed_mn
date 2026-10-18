"use client";

// Short confirmations ("Saved", "Link copied") that don't need a place in
// the layout. Mounted once by DashboardShell; any component below it calls
// useToast(). Announced to screen readers via a polite live region.

import { createContext, ReactNode, useCallback, useContext, useState } from "react";
import { FiAlertCircle, FiCheck } from "react-icons/fi";

type ToastTone = "success" | "error";
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list.slice(-2), { id, message, tone }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), tone === "error" ? 6000 : 3200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-toast flex flex-col items-center gap-2 px-4 sm:bottom-6"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className="pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-lg bg-fg px-4 py-2.5 text-sm font-medium text-page shadow-pop motion-safe:animate-pop-in"
          >
            {item.tone === "success" ? (
              <FiCheck size={16} className="shrink-0 text-emerald-400 dark:text-emerald-600" />
            ) : (
              <FiAlertCircle size={16} className="shrink-0 text-red-400 dark:text-red-600" />
            )}
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

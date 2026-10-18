// A titled card — every dashboard editor is a stack of these. Header (title,
// one-line description, optional actions on the right) above a body, so
// every section of every screen reads the same way.

import { ReactNode } from "react";

interface SectionProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right side of the header — a toggle, a link, a small button. */
  aside?: ReactNode;
  children?: ReactNode;
  /** Anchor id, for in-page navigation. */
  id?: string;
  /** Visual emphasis for a section that needs the manager's attention. */
  tone?: "default" | "warning" | "danger";
  /** Body without inner padding — for tables and lists that run edge to edge. */
  flush?: boolean;
}

export default function Section({ title, description, aside, children, id, tone = "default", flush }: SectionProps) {
  const ring =
    tone === "warning"
      ? "border-amber-500/40"
      : tone === "danger"
        ? "border-red-500/30"
        : "border-line";
  return (
    <section id={id} className={`scroll-mt-24 overflow-hidden rounded-xl border bg-surface shadow-card ${ring}`}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="min-w-0 flex-1 basis-40">
          <h2 className="panel-title">{title}</h2>
          {description && <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-fg-muted">{description}</p>}
        </div>
        {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
      </header>
      {children !== undefined && (
        <div className={flush ? "mt-4 border-t border-line" : "px-4 pb-4 pt-4 sm:px-6 sm:pb-6"}>{children}</div>
      )}
      {children === undefined && <div className="pb-4 sm:pb-5" />}
    </section>
  );
}

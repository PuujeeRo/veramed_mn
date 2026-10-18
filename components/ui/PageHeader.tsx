"use client";

// Top of every dashboard screen: where you are (breadcrumbs), what this is
// (title + one line), and the screen's main actions on the right.

import { ReactNode } from "react";
import { FiChevronRight } from "react-icons/fi";
import { Link } from "@/lib/navigation";

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  crumbs?: Crumb[];
  /** Beside the title — a status pill, a count. */
  meta?: ReactNode;
  actions?: ReactNode;
}

export default function PageHeader({ title, description, crumbs, meta, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 sm:mb-8">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-fg-muted">
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && <FiChevronRight size={14} aria-hidden="true" className="text-fg-faint" />}
                {c.href ? (
                  <Link href={c.href} className="rounded transition hover:text-fg">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="max-w-[16rem] truncate text-fg">
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1 basis-72">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-fg sm:text-[1.75rem] sm:leading-tight">
              {title}
            </h1>
            {meta}
          </div>
          {description && <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

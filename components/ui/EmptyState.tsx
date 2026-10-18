// What a list shows when there's nothing in it yet: what this place is
// for, and the one action that fills it.

import { ReactNode } from "react";
import { IconType } from "react-icons";

interface EmptyStateProps {
  icon: IconType;
  title: string;
  body?: string;
  action?: ReactNode;
  compact?: boolean;
}

export default function EmptyState({ icon: Icon, title, body, action, compact }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "px-4 py-8" : "px-6 py-14"}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-500/15">
        <Icon size={22} />
      </span>
      <h3 className="mt-4 text-base font-semibold text-fg">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Small status label with a coloured dot. The tone carries meaning on its
// own, so it is deliberately NOT the brand red: red reads as an error, and
// "published" is the good state.

export type StatusTone = "success" | "neutral" | "warning" | "danger" | "brand";

const TONES: Record<StatusTone, { pill: string; dot: string }> = {
  success: {
    pill: "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300 dark:ring-emerald-400/25",
    dot: "bg-emerald-500",
  },
  neutral: {
    pill: "bg-subtle text-fg-muted ring-line-strong/60",
    dot: "bg-fg-faint",
  },
  warning: {
    pill: "bg-amber-500/10 text-amber-800 ring-amber-600/25 dark:text-amber-300 dark:ring-amber-400/25",
    dot: "bg-amber-500",
  },
  danger: {
    pill: "bg-red-500/10 text-red-700 ring-red-600/20 dark:text-red-300 dark:ring-red-400/25",
    dot: "bg-red-500",
  },
  brand: {
    pill: "bg-brand-50 text-brand-700 ring-brand-500/20",
    dot: "bg-brand-500",
  },
};

export default function StatusPill({
  tone,
  children,
  dot = true,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  dot?: boolean;
}) {
  const c = TONES[tone];
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium ring-1 ring-inset ${c.pill}`}
    >
      {dot && <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />}
      {children}
    </span>
  );
}

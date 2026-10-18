interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((current / total) * 100);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current}
      className="h-1.5 w-full overflow-hidden rounded-full bg-line"
    >
      {/* scaleX, not width — transform animates on the compositor. */}
      <div
        className="h-full origin-left rounded-full bg-brand-600 transition-transform duration-300 ease-out"
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </div>
  );
}

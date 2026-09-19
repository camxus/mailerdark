import { cx } from "@/lib/cx";

export function ProgressBar({
  value,
  max,
  className,
}: {
  value: number;
  max?: number;
  className?: string;
}) {
  const percentage = max && max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : value;

  return (
    <div
      className={cx("h-2 w-full overflow-hidden rounded-full bg-canvas", className)}
    >
      <div
        className="h-full rounded-full bg-teal transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

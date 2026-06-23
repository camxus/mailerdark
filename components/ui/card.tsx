import { cx } from "@/lib/cx";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cx("rounded-lg border border-line bg-surface", className)}>{children}</div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line py-16 text-center">
      <p className="font-medium text-ink">{title}</p>
      <p className="max-w-sm text-sm text-ink-soft">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

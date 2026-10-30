import { cx } from "@/lib/cx";

type Tone = "neutral" | "teal" | "amber" | "green" | "red";

const tones: Record<Tone, string> = {
  neutral: "bg-canvas text-ink-soft border border-line",
  teal: "bg-teal-soft text-teal-dark",
  amber: "bg-amber-soft text-amber",
  green: "bg-green-soft text-green",
  red: "bg-red-soft text-red",
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

const subscriberStatusTone: Record<string, Tone> = {
  SUBSCRIBED: "green",
  UNSUBSCRIBED: "neutral",
  BOUNCED: "red",
  CLEANED: "amber",
};

export function SubscriberStatusBadge({ status }: { status: string }) {
  return <Badge tone={subscriberStatusTone[status] ?? "neutral"}>{status.toLowerCase()}</Badge>;
}

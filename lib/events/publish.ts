import { db } from "@/lib/db";

export type DomainEventType =
  | "subscriber:created"
  | "subscriber:updated"
  | "subscriber:group-added"
  | "subscriber:group-removed"
  | "subscriber:unsubscribed"
  | "campaign:completed"
  | "campaign:failed"
  | "email:opened"
  | "email:clicked"
  | "email:bounced";

/**
 * Durable write to the EventBus. Automations and analytics both consume
 * from the `events` table rather than being called inline here, so this
 * function intentionally does nothing beyond the insert — see
 * AutomationEngineWorker / AnalyticsAggregatorWorker in WORKERS.md.
 */
export async function publishEvent(
  workspaceId: string,
  type: DomainEventType,
  payload: Record<string, unknown>
) {
  return db.event.create({
    // @ts-expect-error Prisma Json type is incompatible with Record<string, unknown>
    data: { workspaceId, type, payload },
  });
}

import { db } from "@/lib/db";
import type { FieldFilter } from "@/lib/validation/subscriber.schema";

export type Audience = {
  groupIds?: string[];
  fieldFilters?: FieldFilter[];
  subscriberIds?: string[];
  joinedAfter?: string;
};

/**
 * Group membership is OR'd ("send to any of these groups"); field filters
 * are AND'd with that and with each other. `subscriberIds` (a frozen exact
 * list, used by "resend to non-openers") and `joinedAfter` (used by "resend
 * to new subscribers") further AND the result down when present. Only
 * SUBSCRIBED subscribers are ever included — callers don't need to filter
 * status themselves.
 *
 * Field filtering happens in application code rather than as a Postgres
 * JSONB query: customFields is a loosely-typed JSON blob, and at the scale
 * this scaffold targets, fetching the (already group-filtered) candidate
 * set and filtering in memory is simpler and plenty fast. Revisit with a
 * JSONB GIN index + raw SQL if a workspace's subscriber count grows large.
 */
export async function resolveAudience(workspaceId: string, audience: Audience) {
  const subscribers = await db.subscriber.findMany({
    where: {
      workspaceId,
      status: "SUBSCRIBED",
      ...(audience.subscriberIds && audience.subscriberIds.length > 0
        ? { id: { in: audience.subscriberIds } }
        : {}),
      ...(audience.joinedAfter ? { createdAt: { gt: new Date(audience.joinedAfter) } } : {}),
      ...(audience.groupIds && audience.groupIds.length > 0
        ? { groups: { some: { groupId: { in: audience.groupIds } } } }
        : {}),
    },
  });

  if (!audience.fieldFilters || audience.fieldFilters.length === 0) {
    return subscribers;
  }

  return subscribers.filter((s) =>
    audience.fieldFilters!.every((filter) =>
      matchesFilter(s.customFields as Record<string, unknown>, filter)
    )
  );
}

function matchesFilter(fields: Record<string, unknown>, filter: FieldFilter): boolean {
  const value = fields?.[filter.fieldKey];

  switch (filter.operator) {
    case "is_set":
      return value !== undefined && value !== null && value !== "";
    case "is_not_set":
      return value === undefined || value === null || value === "";
    case "equals":
      return String(value ?? "") === String(filter.value ?? "");
    case "not_equals":
      return String(value ?? "") !== String(filter.value ?? "");
    case "contains":
      return String(value ?? "")
        .toLowerCase()
        .includes(String(filter.value ?? "").toLowerCase());
    case "gt":
      return Number(value) > Number(filter.value);
    case "lt":
      return Number(value) < Number(filter.value);
    default:
      return true;
  }
}

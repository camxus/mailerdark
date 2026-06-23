"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SubscriberStatusBadge, Badge } from "@/components/ui/badge";
import {
  useSubscriber,
  useUpdateSubscriber,
  useDeleteSubscriber,
  useSetSubscriberGroup,
} from "@/lib/queries/subscribers";
import { useGroups } from "@/lib/queries/groups";

export function SubscriberDetailPage({
  workspaceId,
  subscriberId,
}: {
  workspaceId: string;
  subscriberId: string;
}) {
  const router = useRouter();
  const { data: subscriber, isLoading } = useSubscriber(workspaceId, subscriberId);
  const { data: groups } = useGroups(workspaceId);
  const updateSubscriber = useUpdateSubscriber(workspaceId, subscriberId);
  const deleteSubscriber = useDeleteSubscriber(workspaceId);
  const setGroup = useSetSubscriberGroup(workspaceId, subscriberId);

  if (isLoading || !subscriber) {
    return <p className="text-sm text-ink-soft">Loading…</p>;
  }

  const memberGroupIds = new Set(subscriber.groups.map((g) => g.id));
  const subscriberEmail = subscriber.email;

  async function handleDelete() {
    if (!confirm(`Remove ${subscriberEmail}? This can't be undone.`)) return;
    await deleteSubscriber.mutateAsync(subscriberId);
    router.push(`/w/${workspaceId}/subscribers`);
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push(`/w/${workspaceId}/subscribers`)}
        className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to subscribers
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">{subscriber.email}</h1>
          <div className="mt-1.5 flex items-center gap-2">
            <SubscriberStatusBadge status={subscriber.status} />
            <span className="text-sm text-ink-soft">
              Added {new Date(subscriber.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={subscriber.status}
            onChange={(e) => updateSubscriber.mutate({ status: e.target.value as never })}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="SUBSCRIBED">Subscribed</option>
            <option value="UNSUBSCRIBED">Unsubscribed</option>
            <option value="BOUNCED">Bounced</option>
            <option value="CLEANED">Cleaned</option>
          </select>
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 size={15} /> Remove
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink">Custom fields</h2>
          {Object.keys(subscriber.customFields).length === 0 ? (
            <p className="text-sm text-ink-soft">No custom field values set.</p>
          ) : (
            <dl className="space-y-2 text-sm">
              {Object.entries(subscriber.customFields).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4">
                  <dt className="text-ink-soft">{key}</dt>
                  <dd className="font-medium text-ink">{String(value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink">Groups</h2>
          <div className="flex flex-wrap gap-2">
            {groups?.map((g) => {
              const checked = memberGroupIds.has(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => setGroup.mutate({ groupId: g.id, add: !checked })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    checked
                      ? "border-teal bg-teal-soft text-teal-dark"
                      : "border-line bg-surface text-ink-soft hover:bg-canvas"
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
            {(!groups || groups.length === 0) && (
              <p className="text-sm text-ink-soft">No groups created yet.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink">Activity</h2>
        {subscriber.activity.length === 0 ? (
          <p className="text-sm text-ink-soft">No emails sent to this subscriber yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {subscriber.activity.map((job) => (
              <li key={job.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-ink">{job.campaign?.subject ?? "Automation email"}</span>
                <div className="flex items-center gap-2">
                  {job.events.map((e, i) => (
                    <Badge key={i} tone="teal">
                      {e.type.toLowerCase()}
                    </Badge>
                  ))}
                  <span className="text-ink-soft">{job.status.toLowerCase()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

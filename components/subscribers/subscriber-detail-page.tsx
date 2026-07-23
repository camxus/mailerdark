"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { SubscriberStatusBadge, Badge } from "@/components/ui/badge";
import {
  useSubscriber,
  useUpdateSubscriber,
  useDeleteSubscriber,
  useSetSubscriberGroup,
} from "@/lib/queries/subscribers";
import { useGroups } from "@/lib/queries/groups";
import { useFields } from "@/lib/queries/fields";

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
  const { data: fields } = useFields(workspaceId);
  const updateSubscriber = useUpdateSubscriber(workspaceId, subscriberId);
  const deleteSubscriber = useDeleteSubscriber(workspaceId);
  const setGroup = useSetSubscriberGroup(workspaceId, subscriberId);

  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (subscriber?.customFields) {
      setCustomFields({ ...subscriber.customFields });
    }
  }, [subscriber?.customFields]);

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

  async function handleSaveCustomFields() {
    await updateSubscriber.mutate({ customFields });
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push(`/w/${workspaceId}/subscribers`)}
        className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to subscribers
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">{subscriber.email}</h1>
          <div className="mt-1.5 flex items-center gap-2">
            <SubscriberStatusBadge status={subscriber.status} />
            <span className="text-sm text-ink-soft">
              Added {new Date(subscriber.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={subscriber.status}
            onChange={(e) => updateSubscriber.mutate({ status: e.target.value as never })}
            className="w-full sm:w-auto rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="SUBSCRIBED">Subscribed</option>
            <option value="UNSUBSCRIBED">Unsubscribed</option>
            <option value="BOUNCED">Bounced</option>
            <option value="CLEANED">Cleaned</option>
          </select>
          <Button variant="danger" onClick={handleDelete} className="w-full sm:w-auto">
            <Trash2 size={15} /> Remove
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Custom fields</h2>
            <Button
              variant="secondary"
              onClick={handleSaveCustomFields}
              disabled={updateSubscriber.isPending}
              className="text-xs px-2.5 py-1.5"
            >
              {updateSubscriber.isPending ? "Saving…" : "Save fields"}
            </Button>
          </div>
          {!fields || fields.length === 0 ? (
            <p className="text-sm text-ink-soft">No custom fields defined yet.</p>
          ) : (
            <div className="space-y-3">
              {fields.map((field) => {
                const value = customFields[field.key];
                return (
                  <div key={field.id}>
                    <Label htmlFor={field.key}>{field.label}</Label>
                    {field.type === "BOOLEAN" ? (
                      <input
                        id={field.key}
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) =>
                          setCustomFields((prev) => ({ ...prev, [field.key]: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border border-line bg-surface accent-teal"
                      />
                    ) : field.type === "DATE" ? (
                      <Input
                        id={field.key}
                        type="date"
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) =>
                          setCustomFields((prev) => ({ ...prev, [field.key]: e.target.value || null }))
                        }
                      />
                    ) : field.type === "NUMBER" ? (
                      <Input
                        id={field.key}
                        type="number"
                        value={typeof value === "number" || typeof value === "string" ? (value as string | number) : ""}
                        onChange={(e) =>
                          setCustomFields((prev) => ({
                            ...prev,
                            [field.key]: e.target.value === "" ? null : Number(e.target.value),
                          }))
                        }
                      />
                    ) : (
                      <Input
                        id={field.key}
                        type="text"
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) =>
                          setCustomFields((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <FieldError>{updateSubscriber.error?.message}</FieldError>
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
              <li key={job.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 text-sm gap-2">
                <span className="text-ink">{job.campaign?.subject ?? "Automation email"}</span>
                <div className="flex flex-wrap items-center gap-2">
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

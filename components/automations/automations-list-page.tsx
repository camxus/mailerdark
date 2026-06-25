"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AutomationTemplateSelector } from "./automation-template-selector";
import {
  useAutomations, useCreateAutomation, useDeleteAutomation,
  type AutomationStatus,
} from "@/lib/queries/automations";
import type { AutomationTemplate } from "@/lib/templates/automation-templates";
import type { FlowDefinition } from "@/lib/automations/types";

const statusTone: Record<AutomationStatus, "neutral" | "teal" | "amber" | "green" | "red"> = {
  DRAFT: "neutral",
  ACTIVE: "green",
  PAUSED: "amber",
};

const triggerLabels: Record<string, string> = {
  SUBSCRIBER_CREATED: "Subscriber created",
  SUBSCRIBER_ADDED_TO_GROUP: "Added to group",
  FIELD_CHANGED: "Field changed",
  CAMPAIGN_OPENED: "Campaign opened",
  CAMPAIGN_CLICKED: "Campaign clicked",
  DATE_BASED: "Date based",
};

export function AutomationsListPage({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const { data: automations, isLoading } = useAutomations(workspaceId);
  const deleteAutomation = useDeleteAutomation(workspaceId);
  const createAutomation = useCreateAutomation(workspaceId);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  async function handleCreate(template: AutomationTemplate | null) {
    const automation = await createAutomation.mutateAsync({
      name: "Untitled automation",
      triggerType: "SUBSCRIBER_CREATED",
      flowDefinition: template?.flowDefinition ?? { nodes: [], edges: [] },
    } as { name: string; triggerType: string; flowDefinition: FlowDefinition });
    router.push(`/w/${workspaceId}/automations/${automation.id}/build`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Automations</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Build flows that react to subscriber behaviour — no code needed.
          </p>
        </div>
        <Button onClick={() => setShowTemplateSelector(true)} disabled={createAutomation.isPending}>
          <Plus size={16} /> {createAutomation.isPending ? "Creating…" : "New automation"}
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <p className="p-6 text-sm text-ink-soft">Loading…</p>
        ) : !automations || automations.length === 0 ? (
          <EmptyState
            title="No automations yet"
            description="Automations send emails, add subscribers to groups, and more — triggered automatically by events."
            action={<Button onClick={() => setShowTemplateSelector(true)}>New automation</Button>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Trigger</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Active runs</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {automations.map((a) => (
                <tr key={a.id} className="hover:bg-canvas">
                  <td className="px-4 py-3">
                    <Link
                      href={`/w/${workspaceId}/automations/${a.id}/build`}
                      className="font-medium text-ink hover:text-teal-dark"
                    >
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {triggerLabels[a.triggerType] ?? a.triggerType}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[a.status as AutomationStatus]}>
                      {a.status.toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{a.activeRuns}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => router.push(`/w/${workspaceId}/automations/${a.id}/build`)}
                        className="rounded-md p-1.5 text-ink-soft hover:bg-canvas hover:text-ink"
                        title="Open builder"
                      >
                        {a.status === "ACTIVE" ? <Pause size={15} /> : <Play size={15} />}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${a.name}"?`)) deleteAutomation.mutate(a.id);
                        }}
                        className="rounded-md p-1.5 text-ink-soft hover:bg-red-soft hover:text-red"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {showTemplateSelector && (
        <AutomationTemplateSelector
          onSelect={handleCreate}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
    </div>
  );
}
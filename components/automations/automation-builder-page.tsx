"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AutomationCanvas } from "./automation-canvas";
import {
  useAutomation,
  useUpdateAutomation,
  useActivateAutomation,
  usePauseAutomation,
  useAutomationRuns,
  type AutomationStatus,
} from "@/lib/queries/automations";
import type { FlowDefinition } from "@/lib/automations/types";

const statusTone: Record<AutomationStatus, "neutral" | "teal" | "amber" | "green" | "red"> = {
  DRAFT: "neutral",
  ACTIVE: "green",
  PAUSED: "amber",
};

const runStatusTone: Record<string, "neutral" | "teal" | "amber" | "green" | "red"> = {
  RUNNING: "teal",
  WAITING: "amber",
  COMPLETED: "green",
  EXITED: "neutral",
  FAILED: "red",
};

export function AutomationBuilderPage({ workspaceId, automationId }: { workspaceId: string; automationId: string }) {
  const router = useRouter();
  const { data: automation, isLoading } = useAutomation(workspaceId, automationId);
  const updateAutomation = useUpdateAutomation(workspaceId, automationId);
  const activateAutomation = useActivateAutomation(workspaceId, automationId);
  const pauseAutomation = usePauseAutomation(workspaceId, automationId);
  const { data: runs } = useAutomationRuns(workspaceId, automationId);

  if (isLoading || !automation) return <p className="text-sm text-ink-soft">Loading…</p>;

  const isEditable = automation.status !== "ACTIVE";

  async function handleSave(flow: FlowDefinition) {
    await updateAutomation.mutateAsync({ flowDefinition: flow });
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push(`/w/${workspaceId}/automations`)}
        className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to automations
      </button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-ink">{automation.name}</h1>
          <Badge tone={statusTone[automation.status as AutomationStatus]}>
            {automation.status.toLowerCase()}
          </Badge>
        </div>
        <div className="flex gap-2">
          {automation.status === "ACTIVE" ? (
            <Button variant="secondary" onClick={() => pauseAutomation.mutate()} disabled={pauseAutomation.isPending}>
              <Pause size={15} /> {pauseAutomation.isPending ? "Pausing…" : "Pause"}
            </Button>
          ) : (
            <Button onClick={() => activateAutomation.mutate()} disabled={activateAutomation.isPending}>
              <Play size={15} /> {activateAutomation.isPending ? "Activating…" : "Activate"}
            </Button>
          )}
        </div>
      </div>

      {activateAutomation.error && (
        <p className="text-sm text-red">{activateAutomation.error.message}</p>
      )}

      <AutomationCanvas
        workspaceId={workspaceId}
        automationId={automationId}
        initialFlow={automation.flowDefinition}
        readonly={!isEditable}
        onSave={isEditable ? handleSave : undefined}
        isSaving={updateAutomation.isPending}
      />

      {!isEditable && (
        <p className="text-xs text-ink-soft text-center">
          Pause the automation to edit its flow — in-flight runs will hold their position.
        </p>
      )}

      {runs && runs.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink">Recent runs</h2>
          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="px-4 py-3 font-medium">Subscriber</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Current node</th>
                  <th className="px-4 py-3 font-medium">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-canvas">
                    <td className="px-4 py-3 text-ink">{r.subscriberEmail}</td>
                    <td className="px-4 py-3">
                      <Badge tone={runStatusTone[r.status] ?? "neutral"}>{r.status.toLowerCase()}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-soft font-mono text-xs">{r.currentNodeId ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{new Date(r.startedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

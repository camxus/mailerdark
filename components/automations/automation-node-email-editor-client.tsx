"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  useAutomation, useUpdateAutomation,
} from "@/lib/queries/automations";
import dynamic from "next/dynamic";

const SplitEditorPane = dynamic(
  () => import("@/components/campaigns/editor/split-editor-pane").then((m) => m.SplitEditorPane),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[620px] items-center justify-center rounded-lg border border-line bg-canvas text-sm text-ink-soft">
        Loading editor…
      </div>
    ),
  }
);

const statusTone = {
  DRAFT: "neutral" as const, ACTIVE: "green" as const, PAUSED: "amber" as const,
};

export function AutomationNodeEmailEditorClient({
  workspaceId,
  automationId,
  nodeId,
}: {
  workspaceId: string;
  automationId: string;
  nodeId: string;
}) {
  const router = useRouter();
  const { data: automation, isLoading } = useAutomation(workspaceId, automationId);
  const updateAutomation = useUpdateAutomation(workspaceId, automationId);

  const node = automation?.flowDefinition.nodes.find((n) => n.id === nodeId);
  const nodeData = node?.type === "sendEmail" ? node.data as { htmlContent?: string } : null;

  const initialHtml = useMemo(() => nodeData?.htmlContent ?? "", [nodeData?.htmlContent]);
  const [htmlContent, setHtmlContent] = useState(initialHtml);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!automation || !nodeData) return;
      const updatedFlow = {
        ...automation.flowDefinition,
        nodes: automation.flowDefinition.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, htmlContent } }
            : n
        ),
      };
      await updateAutomation.mutateAsync({ flowDefinition: updatedFlow });
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [htmlContent, automation, nodeId, nodeData, updateAutomation]);

  if (isLoading || !automation || !nodeData) {
    return <p className="text-sm text-ink-soft">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/w/${workspaceId}/automations/${automationId}/build`)}
          className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
        >
          <ArrowLeft size={15} /> Back to builder
        </button>
        <Badge tone={statusTone[automation.status] ?? "neutral"}>{automation.status.toLowerCase()}</Badge>
      </div>

      <div className="flex h-[620px] overflow-hidden rounded-lg border border-line">
        <SplitEditorPane
          workspaceId={workspaceId}
          value={htmlContent}
          onChange={setHtmlContent}
          disabled={automation.status === "ACTIVE"}
        />
      </div>
    </div>
  );
}

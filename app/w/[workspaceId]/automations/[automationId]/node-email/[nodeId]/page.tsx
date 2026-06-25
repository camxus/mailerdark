import { AutomationNodeEmailEditorClient } from "@/components/automations/automation-node-email-editor-client";

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string; automationId: string; nodeId: string }>;
}) {
  const { workspaceId, automationId, nodeId } = await params;
  return <AutomationNodeEmailEditorClient workspaceId={workspaceId} automationId={automationId} nodeId={nodeId} />;
}

import { AutomationBuilderPage } from "@/components/automations/automation-builder-page";

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string; automationId: string }>;
}) {
  const { workspaceId, automationId } = await params;
  return <AutomationBuilderPage workspaceId={workspaceId} automationId={automationId} />;
}

import { AiSettingsPage } from "@/components/campaigns/ai-editor/ai-settings-page";

export default async function Page({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <AiSettingsPage workspaceId={workspaceId} />;
}

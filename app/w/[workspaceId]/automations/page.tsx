import { AutomationsListPage } from "@/components/automations/automations-list-page";

export default async function Page({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <AutomationsListPage workspaceId={workspaceId} />;
}

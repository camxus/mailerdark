import { GroupsPage } from "@/components/groups/groups-page";

export default async function Page({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <GroupsPage workspaceId={workspaceId} />;
}

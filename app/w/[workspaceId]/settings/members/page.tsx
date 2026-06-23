import { MembersPage } from "@/components/dashboard/members-page";

export default async function Page({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <MembersPage workspaceId={workspaceId} />;
}

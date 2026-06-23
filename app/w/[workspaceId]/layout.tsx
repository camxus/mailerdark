import { getWorkspaceContext } from "@/lib/auth/get-workspace-context";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { workspace, workspaces, user } = await getWorkspaceContext(workspaceId);

  return (
    <DashboardShell workspace={workspace} workspaces={workspaces} userEmail={user.email}>
      {children}
    </DashboardShell>
  );
}

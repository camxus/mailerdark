import { DomainsPage } from "@/components/domains/domains-page";

export default async function Page({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <DomainsPage workspaceId={workspaceId} />;
}

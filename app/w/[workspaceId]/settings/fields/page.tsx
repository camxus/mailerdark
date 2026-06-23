import { FieldsPage } from "@/components/fields/fields-page";

export default async function Page({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <FieldsPage workspaceId={workspaceId} />;
}

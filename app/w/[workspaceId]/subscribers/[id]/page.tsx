import { SubscriberDetailPage } from "@/components/subscribers/subscriber-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string; id: string }>;
}) {
  const { workspaceId, id } = await params;
  return <SubscriberDetailPage workspaceId={workspaceId} subscriberId={id} />;
}

import { CampaignEditor } from "@/components/campaigns/campaign-editor";

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string; campaignId: string }>;
}) {
  const { workspaceId, campaignId } = await params;
  return <CampaignEditor workspaceId={workspaceId} campaignId={campaignId} />;
}

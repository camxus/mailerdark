import { CampaignComposePage } from "@/components/campaigns/campaign-compose-page";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string; campaignId: string }>;
}) {
  const { workspaceId, campaignId } = await params;
  return <CampaignComposePage workspaceId={workspaceId} campaignId={campaignId} />;
}

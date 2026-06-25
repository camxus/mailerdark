"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  useCampaign, useUpdateCampaign, usePreviewCampaign, type Campaign,
} from "@/lib/queries/campaigns";
import dynamic from "next/dynamic";

const SplitEditorPane = dynamic(
  () => import("@/components/campaigns/editor/split-editor-pane").then((m) => m.SplitEditorPane),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[620px] items-center justify-center rounded-lg border border-line bg-canvas text-sm text-ink-soft">
        Loading editor…
      </div>
    ),
  }
);

export function CampaignComposePage({ workspaceId, campaignId }: { workspaceId: string; campaignId: string }) {
  const router = useRouter();
  const { data: campaign, isLoading } = useCampaign(workspaceId, campaignId);

  if (isLoading || !campaign) {
    return <p className="text-sm text-ink-soft">Loading…</p>;
  }

  return (
    <CampaignComposeForm
      workspaceId={workspaceId}
      campaignId={campaignId}
      campaign={campaign}
      router={router}
    />
  );
}

function CampaignComposeForm({
  workspaceId,
  campaignId,
  campaign,
  router,
}: {
  workspaceId: string;
  campaignId: string;
  campaign: Campaign;
  router: ReturnType<typeof useRouter>;
}) {
  const updateCampaign = useUpdateCampaign(workspaceId, campaignId);
  const previewCampaign = usePreviewCampaign(workspaceId, campaignId);
  const [htmlContent, setHtmlContent] = useState(campaign.htmlContent);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLive = campaign.status !== "DRAFT";

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await updateCampaign.mutateAsync({ htmlContent });
      const result = await previewCampaign.mutateAsync({}).catch(() => null);
      if (result) setPreviewHtml(result.html);
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [htmlContent, campaign.id, updateCampaign, previewCampaign]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/w/${workspaceId}/campaigns/${campaign.id}/edit`)}
            className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
          >
            <ArrowLeft size={15} /> Back to details
          </button>
          <CampaignBadge status={campaign.status} />
        </div>
      </div>

      <SplitEditorPane
        workspaceId={workspaceId}
        value={htmlContent}
        onChange={setHtmlContent}
        previewHtml={previewHtml}
        disabled={isLive}
      />
    </div>
  );
}

const statusTone = {
  DRAFT: "neutral" as const, SCHEDULED: "amber" as const, SENDING: "teal" as const,
  SENT: "green" as const, FAILED: "red" as const, PAUSED: "amber" as const,
};
function CampaignBadge({ status }: { status: Campaign["status"] }) {
  return <Badge tone={statusTone[status]}>{status.toLowerCase()}</Badge>;
}

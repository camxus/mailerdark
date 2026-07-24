"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TemplateSelector } from "./template-selector";
import { useCampaigns, useCreateCampaign, type CampaignStatus } from "@/lib/queries/campaigns";
import type { CampaignTemplate } from "@/lib/templates/campaign-templates";

const statusTone: Record<CampaignStatus, "neutral" | "teal" | "amber" | "green" | "red"> = {
  DRAFT: "neutral",
  SCHEDULED: "amber",
  SENDING: "teal",
  SENT: "green",
  FAILED: "red",
  PAUSED: "amber",
};

export function CampaignsListPage({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const { data: campaigns, isLoading } = useCampaigns(workspaceId);
  const createCampaign = useCreateCampaign(workspaceId);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  async function handleCreate(template: CampaignTemplate | null) {
    try {
      const campaign = await createCampaign.mutateAsync({
        subject: template?.subject ?? "Untitled campaign",
        htmlContent: template?.html ?? "<p>Write your email here…</p>",
      });
      router.push(`/w/${workspaceId}/campaigns/${campaign.id}/edit`);
    } catch (err) {
      console.error("Failed to create campaign:", err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Campaigns</h1>
          <p className="mt-1 text-sm text-ink-soft">Compose and send one-off emails to your audience.</p>
        </div>
        <Button onClick={() => setShowTemplateSelector(true)} disabled={createCampaign.isPending}>
          <Plus size={16} /> {createCampaign.isPending ? "Creating…" : "New campaign"}
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <p className="p-6 text-sm text-ink-soft">Loading…</p>
        ) : !campaigns || campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            description="Create your first campaign to send a one-off email to your subscribers."
            action={<Button onClick={() => setShowTemplateSelector(true)}>New campaign</Button>}
          />
        ) : (
          <div className="table-container">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="px-3 py-2 sm:px-4 sm:py-3 font-medium">Subject</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 font-medium hidden sm:table-cell">Status</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 font-medium hidden md:table-cell">Preview</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 font-medium hidden lg:table-cell">Recipients</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 font-medium hidden lg:table-cell">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-canvas">
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      <div>
                        <Link
                          href={`/w/${workspaceId}/campaigns/${c.id}/edit`}
                          className="font-medium text-ink hover:text-teal-dark"
                        >
                          {c.subject || "Untitled campaign"}
                        </Link>
                        <div className="mt-1 sm:hidden">
                          <Badge tone={statusTone[c.status]}>{c.status.toLowerCase()}</Badge>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 hidden sm:table-cell">
                      <Badge tone={statusTone[c.status]}>{c.status.toLowerCase()}</Badge>
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 hidden md:table-cell">
                      <div className="h-12 w-24 overflow-hidden rounded border border-line bg-canvas">
                        <iframe
                          src={`/w/${workspaceId}/campaigns/${c.id}/preview`}
                          className="h-full w-full scale-50"
                          style={{ transformOrigin: "top left", pointerEvents: "none" }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-ink-soft hidden lg:table-cell">{c.jobCount || "—"}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-ink-soft hidden lg:table-cell">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showTemplateSelector && (
        <TemplateSelector
          onSelect={handleCreate}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
    </div>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Send, Calendar, Pause, Trash2,
  MoreHorizontal, MailX, UserPlus, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { AudienceFilter, type AudienceValue } from "@/components/audience/audience-filter";
import { HtmlPreviewModal } from "./editor/html-preview-modal";
import { TestSendDialog } from "./test-send-dialog";
import { ScheduleDialog } from "./schedule-dialog";
import {
  useCampaign, useUpdateCampaign, useDeleteCampaign,
  useSendCampaignNow, usePauseCampaign,
  useCampaignStats, useResendCampaign,
  type CampaignStatus, type ResendMode,
} from "@/lib/queries/campaigns";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Tab = "compose" | "audience";

const statusTone: Record<CampaignStatus, "neutral" | "teal" | "amber" | "green" | "red"> = {
  DRAFT: "neutral",
  SCHEDULED: "amber",
  SENDING: "teal",
  SENT: "green",
  FAILED: "red",
  PAUSED: "amber",
};

export function CampaignEditor({ workspaceId, campaignId }: { workspaceId: string; campaignId: string }) {
  const { data: campaign, isLoading } = useCampaign(workspaceId, campaignId);
  if (isLoading || !campaign) return <p className="text-sm text-ink-soft">Loading…</p>;
  return <CampaignEditorForm key={campaignId} workspaceId={workspaceId} campaign={campaign} />;
}

function CampaignEditorForm({
  workspaceId,
  campaign,
}: {
  workspaceId: string;
  campaign: NonNullable<ReturnType<typeof useCampaign>["data"]>;
}) {
  const router = useRouter();
  const campaignId = campaign.id;

  const updateCampaign = useUpdateCampaign(workspaceId, campaignId);
  const deleteCampaign = useDeleteCampaign(workspaceId);
  const sendNow = useSendCampaignNow(workspaceId, campaignId);
  const pauseCampaign = usePauseCampaign(workspaceId, campaignId);
  const resendCampaign = useResendCampaign(workspaceId, campaignId);

  const isLive = campaign.status !== "DRAFT";

  const { data: stats } = useCampaignStats(workspaceId, campaignId, {
    pollMs: campaign.status === "SENDING" ? 4000 : undefined,
  });

  const [tab, setTab] = useState<Tab>("compose");
  const [subject, setSubject] = useState(campaign.subject);
  const [fromName, setFromName] = useState(campaign.fromName);
  const [fromEmail, setFromEmail] = useState(campaign.fromEmail);
  const [replyTo, setReplyTo] = useState(campaign.replyTo ?? "");
  const htmlContent = campaign.htmlContent;
  const [audience, setAudience] = useState<AudienceValue>(campaign.audience ?? {});
  const [showTestSend, setShowTestSend] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  async function handleSave() {
    await updateCampaign.mutateAsync({
      subject, fromName, fromEmail,
      replyTo: replyTo || undefined,
      htmlContent, audience,
    });
  }

  async function handleSendNow() {
    if (!fromName.trim() || !emailRegex.test(fromEmail)) {
      alert("Please set a valid from name and email address before sending.");
      return;
    }
    if (!confirm("Send this campaign now?")) return;
    await sendNow.mutateAsync();
  }

  async function handleTestSend() {
    if (!fromName.trim() || !emailRegex.test(fromEmail)) {
      alert("Please set a valid from name and email address before sending tests.");
      return;
    }
    setShowTestSend(true);
  }

  async function handleDelete() {
    if (!confirm("Delete this draft campaign?")) return;
    await deleteCampaign.mutateAsync(campaignId);
    router.push(`/w/${workspaceId}/campaigns`);
  }

  async function handleResend(mode: ResendMode) {
    const result = await resendCampaign.mutateAsync(mode);
    router.push(`/w/${workspaceId}/campaigns/${result.id}/edit`);
  }

  const anyError =
    updateCampaign.error?.message ||
    sendNow.error?.message ||
    resendCampaign.error?.message;

  return (
    <div className="space-y-5">
      {/* ── Back + title ── */}
      <button
        onClick={() => router.push(`/w/${workspaceId}/campaigns`)}
        className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to campaigns
      </button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-ink">{subject || "Untitled campaign"}</h1>
          <Badge tone={statusTone[campaign.status]}>{campaign.status.toLowerCase()}</Badge>
        </div>

        <div className="flex gap-2">
          {campaign.status === "DRAFT" && (
            <button
              onClick={handleDelete}
              className="rounded-md p-2 text-ink-soft hover:bg-red-soft hover:text-red"
              title="Delete draft"
            >
              <Trash2 size={16} />
            </button>
          )}
          {!isLive && (
            <Button variant="secondary" onClick={handleSave} disabled={updateCampaign.isPending}>
              {updateCampaign.isPending ? "Saving…" : "Save draft"}
            </Button>
          )}
          {!isLive && (
            <Button variant="secondary" onClick={handleTestSend}>
              Send test
            </Button>
          )}
          {!isLive && (
            <Button variant="secondary" onClick={() => {
              if (!fromName.trim() || !emailRegex.test(fromEmail)) {
                alert("Please set a valid from name and email address before scheduling.");
                return;
              }
              setShowSchedule(true);
            }}>
              <Calendar size={15} /> Schedule
            </Button>
          )}
          {!isLive && (
            <Button
              onClick={handleSendNow}
              disabled={sendNow.isPending}
            >
              <Send size={15} /> {sendNow.isPending ? "Sending…" : "Send now"}
            </Button>
          )}
          {(campaign.status === "SENDING" || campaign.status === "SCHEDULED") && (
            <Button
              variant="secondary"
              onClick={() => pauseCampaign.mutate()}
              disabled={pauseCampaign.isPending}
            >
              <Pause size={15} /> Pause
            </Button>
          )}
          {campaign.status === "SENT" && (
            <DropdownMenu
              trigger={
                <Button variant="secondary" disabled={resendCampaign.isPending}>
                  <MoreHorizontal size={15} />
                  {resendCampaign.isPending ? "Creating…" : "More"}
                </Button>
              }
              items={[
                {
                  label: "Resend to non-openers",
                  description: "Only people who never opened this campaign, as a new draft",
                  icon: <MailX size={15} />,
                  onClick: () => handleResend("non_openers"),
                },
                {
                  label: "Resend to new subscribers",
                  description: "Anyone matching the original audience who joined since this was sent",
                  icon: <UserPlus size={15} />,
                  onClick: () => handleResend("new_subscribers"),
                },
                {
                  label: "Resend to everyone",
                  description: "Send this exact campaign again to its full audience",
                  icon: <Copy size={15} />,
                  onClick: () => handleResend("duplicate"),
                },
              ]}
            />
          )}
        </div>
      </div>

      {anyError && <FieldError>{anyError}</FieldError>}

      {/* ── Live stats (while sending) ── */}
      {stats && isLive && (
        <Card className="grid grid-cols-5 divide-x divide-line p-0">
          <Stat label="Sent" value={stats.sent} />
          <Stat label="Opens" value={`${stats.uniqueOpens} (${Math.round(stats.openRate * 100)}%)`} />
          <Stat label="Clicks" value={`${stats.uniqueClicks} (${Math.round(stats.clickRate * 100)}%)`} />
          <Stat label="Failed" value={stats.failed} />
          <Stat label="Queued" value={stats.queued} />
        </Card>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-line">
        {(["compose", "audience"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-b-2 border-teal text-teal-dark"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Compose tab ── */}
      {tab === "compose" && (
        <div className="space-y-4">
          {/* From / Subject row */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isLive}
                  placeholder="Your subject line — {{first_name}} merge fields work here"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="fromName">From name</Label>
                  <Input id="fromName" value={fromName} onChange={(e) => setFromName(e.target.value)} disabled={isLive} />
                </div>
                <div>
                  <Label htmlFor="fromEmail">From email</Label>
                  <Input id="fromEmail" type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} disabled={isLive} />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-6">
              <div className="flex-1">
                <Label htmlFor="replyTo">Reply-to (optional)</Label>
                <Input id="replyTo" type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} disabled={isLive} />
              </div>
              <p className="mt-5 text-xs text-ink-soft">
                Verify DNS →{" "}
                <a href={`/w/${workspaceId}/settings/domains`} className="text-teal hover:text-teal-dark underline">
                  Settings → Sending domains
                </a>
              </p>
            </div>
          </Card>

          {/* Email preview + actions */}
          <Card className="p-4">
            <div className="flex items-start gap-4">
              <div
                onClick={() => setShowPreviewModal(true)}
                className="cursor-pointer rounded-md border border-line bg-white p-1 hover:border-teal transition-colors"
                style={{ width: "280px", minHeight: "180px", flexShrink: 0 }}
              >
                <iframe
                  title="Email preview thumbnail"
                  sandbox=""
                  srcDoc={htmlContent}
                  className="w-full border-0"
                  style={{ height: "160px", display: "block" }}
                />
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-sm text-ink-soft">
                  This campaign currently has an email template. Click the preview to view it, or open the editor to make changes.
                </p>
                <Button variant="secondary" onClick={() => router.push(`/w/${workspaceId}/campaigns/${campaignId}/compose`)}>
                  Edit email
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Audience tab ── */}
      {tab === "audience" && (
        <Card className="p-5">
          <AudienceFilter workspaceId={workspaceId} value={audience} onChange={setAudience} />
        </Card>
      )}

      {/* ── Modals ── */}
      {showPreviewModal && (
        <HtmlPreviewModal
          value={htmlContent}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
      {showTestSend && (
        <TestSendDialog
          workspaceId={workspaceId}
          campaignId={campaignId}
          onClose={() => setShowTestSend(false)}
        />
      )}
      {showSchedule && (
        <ScheduleDialog
          workspaceId={workspaceId}
          campaignId={campaignId}
          onClose={() => setShowSchedule(false)}
          onScheduled={() => setShowSchedule(false)}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

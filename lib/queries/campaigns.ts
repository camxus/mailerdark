"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import type { Audience } from "@/lib/validation/campaign.schema";

export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "FAILED" | "PAUSED";

export type CampaignSummary = {
  id: string;
  subject: string;
  status: CampaignStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  jobCount: number;
};

export type Campaign = {
  id: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  htmlContent: string;
  status: CampaignStatus;
  audience: Audience;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type CampaignStats = {
  status: CampaignStatus;
  total: number;
  sent: number;
  failed: number;
  queued: number;
  opens: number;
  uniqueOpens: number;
  clicks: number;
  uniqueClicks: number;
  unsubscribes: number;
  openRate: number;
  clickRate: number;
};

const key = {
  list: (workspaceId: string) => ["campaigns", workspaceId],
  detail: (workspaceId: string, id: string) => ["campaign", workspaceId, id],
  stats: (workspaceId: string, id: string) => ["campaign-stats", workspaceId, id],
};

export function useCampaigns(workspaceId: string) {
  return useQuery({
    queryKey: key.list(workspaceId),
    queryFn: () => apiFetch<CampaignSummary[]>(`/api/workspaces/${workspaceId}/campaigns`),
  });
}

export function useCampaign(workspaceId: string, id: string) {
  return useQuery({
    queryKey: key.detail(workspaceId, id),
    queryFn: () => apiFetch<Campaign>(`/api/workspaces/${workspaceId}/campaigns/${id}`),
    enabled: Boolean(id),
  });
}

export function useCampaignStats(workspaceId: string, id: string, options?: { pollMs?: number }) {
  return useQuery({
    queryKey: key.stats(workspaceId, id),
    queryFn: () => apiFetch<CampaignStats>(`/api/workspaces/${workspaceId}/campaigns/${id}/stats`),
    enabled: Boolean(id),
    refetchInterval: options?.pollMs,
  });
}

export function useCreateCampaign(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<Campaign>(`/api/workspaces/${workspaceId}/campaigns`, {
        method: "POST",
        body: JSON.stringify({
          subject: "Untitled campaign",
          fromName: "",
          fromEmail: "",
          htmlContent: "<p>Write your email here…</p>",
          audience: {},
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key.list(workspaceId) }),
  });
}

export function useUpdateCampaign(workspaceId: string, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Pick<Campaign, "subject" | "fromName" | "fromEmail" | "replyTo" | "htmlContent" | "audience">>) =>
      apiFetch<Campaign>(`/api/workspaces/${workspaceId}/campaigns/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(key.detail(workspaceId, id), data);
      queryClient.invalidateQueries({ queryKey: key.list(workspaceId) });
    },
  });
}

export function useDeleteCampaign(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/workspaces/${workspaceId}/campaigns/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key.list(workspaceId) }),
  });
}

export function usePreviewCampaign(workspaceId: string, id: string) {
  return useMutation({
    mutationFn: (input?: { subscriberId?: string }) =>
      apiFetch<{ subject: string; html: string; usingSampleData: boolean; previewedAs: string }>(
        `/api/workspaces/${workspaceId}/campaigns/${id}/preview`,
        { method: "POST", body: JSON.stringify(input ?? {}) }
      ),
  });
}

export function useTestSendCampaign(workspaceId: string, id: string) {
  return useMutation({
    mutationFn: (emails: string[]) =>
      apiFetch<{ results: { email: string; ok: boolean; error?: string }[] }>(
        `/api/workspaces/${workspaceId}/campaigns/${id}/test-send`,
        { method: "POST", body: JSON.stringify({ emails }) }
      ),
  });
}

export function useScheduleCampaign(workspaceId: string, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduledAt: string) =>
      apiFetch<Campaign>(`/api/workspaces/${workspaceId}/campaigns/${id}/schedule`, {
        method: "POST",
        body: JSON.stringify({ scheduledAt }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(key.detail(workspaceId, id), data);
      queryClient.invalidateQueries({ queryKey: key.list(workspaceId) });
    },
  });
}

export function useSendCampaignNow(workspaceId: string, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ totalRecipients: number; sentCount: number; failedCount: number; deferredCount: number }>(
        `/api/workspaces/${workspaceId}/campaigns/${id}/send-now`,
        { method: "POST" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key.detail(workspaceId, id) });
      queryClient.invalidateQueries({ queryKey: key.list(workspaceId) });
      queryClient.invalidateQueries({ queryKey: key.stats(workspaceId, id) });
    },
  });
}

export function usePauseCampaign(workspaceId: string, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<Campaign>(`/api/workspaces/${workspaceId}/campaigns/${id}/pause`, { method: "POST" }),
    onSuccess: (data) => {
      queryClient.setQueryData(key.detail(workspaceId, id), data);
      queryClient.invalidateQueries({ queryKey: key.list(workspaceId) });
    },
  });
}

export type ResendMode = "non_openers" | "new_subscribers" | "duplicate";

export function useResendCampaign(workspaceId: string, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mode: ResendMode) =>
      apiFetch<Campaign & { recipientCount: number }>(`/api/workspaces/${workspaceId}/campaigns/${id}/resend`, {
        method: "POST",
        body: JSON.stringify({ mode }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key.list(workspaceId) }),
  });
}

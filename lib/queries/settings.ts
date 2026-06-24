"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

export type AiSettings = {
  aiMode: string;
  openRouterKeyMasked: string;
  openRouterKeySet: boolean;
  customEndpoint: string | null;
  customKeyMasked: string;
  customKeySet: boolean;
  selectedModel: string;
};

export type GeneralSettings = {
  name: string;
  slug: string;
  fromName: string | null;
  fromEmail: string | null;
  timezone: string;
};

export type AiModel = {
  id: string;
  name: string;
  context_length: number;
  pricing?: { prompt: string };
};

export function useAiSettings(workspaceId: string) {
  return useQuery({
    queryKey: ["ai-settings", workspaceId],
    queryFn: () => apiFetch<AiSettings>(`/api/workspaces/${workspaceId}/settings/ai`),
  });
}

export function useUpdateAiSettings(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      aiMode?: string;
      openRouterKey?: string;
      customEndpoint?: string;
      customKey?: string;
      selectedModel?: string;
    }) =>
      apiFetch<AiSettings>(`/api/workspaces/${workspaceId}/settings/ai`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => queryClient.setQueryData(["ai-settings", workspaceId], data),
  });
}

export function useAiModels(workspaceId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["ai-models", workspaceId],
    queryFn: () => apiFetch<AiModel[]>(`/api/workspaces/${workspaceId}/ai/models`),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useGeneralSettings(workspaceId: string) {
  return useQuery({
    queryKey: ["general-settings", workspaceId],
    queryFn: () => apiFetch<GeneralSettings>(`/api/workspaces/${workspaceId}/settings`),
  });
}

export function useUpdateGeneralSettings(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; fromName?: string; fromEmail?: string; timezone?: string }) =>
      apiFetch<GeneralSettings>(`/api/workspaces/${workspaceId}/settings`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => queryClient.setQueryData(["general-settings", workspaceId], data),
  });
}

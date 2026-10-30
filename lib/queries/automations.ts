"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import type { FlowDefinition } from "@/lib/automations/types";

export type AutomationStatus = "DRAFT" | "ACTIVE" | "PAUSED";

export type AutomationSummary = {
  id: string;
  name: string;
  status: AutomationStatus;
  triggerType: string;
  activeRuns: number;
  createdAt: string;
};

export type Automation = {
  id: string;
  name: string;
  status: AutomationStatus;
  triggerType: string;
  flowDefinition: FlowDefinition;
  createdAt: string;
};

export type AutomationRun = {
  id: string;
  subscriberEmail: string;
  status: string;
  currentNodeId: string | null;
  resumeAt: string | null;
  startedAt: string;
  finishedAt: string | null;
};

const keys = {
  list: (ws: string) => ["automations", ws],
  detail: (ws: string, id: string) => ["automation", ws, id],
  runs: (ws: string, id: string) => ["automation-runs", ws, id],
};

export function useAutomations(workspaceId: string) {
  return useQuery({
    queryKey: keys.list(workspaceId),
    queryFn: () => apiFetch<AutomationSummary[]>(`/api/workspaces/${workspaceId}/automations`),
  });
}

export function useAutomation(workspaceId: string, id: string) {
  return useQuery({
    queryKey: keys.detail(workspaceId, id),
    queryFn: () => apiFetch<Automation>(`/api/workspaces/${workspaceId}/automations/${id}`),
    enabled: Boolean(id),
  });
}

export function useAutomationRuns(workspaceId: string, id: string) {
  return useQuery({
    queryKey: keys.runs(workspaceId, id),
    queryFn: () => apiFetch<AutomationRun[]>(`/api/workspaces/${workspaceId}/automations/${id}/runs`),
    enabled: Boolean(id),
  });
}

export function useCreateAutomation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; triggerType: string; flowDefinition?: FlowDefinition }) =>
      apiFetch<Automation>(`/api/workspaces/${workspaceId}/automations`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.list(workspaceId) }),
  });
}

export function useUpdateAutomation(workspaceId: string, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; flowDefinition?: FlowDefinition }) =>
      apiFetch<Automation>(`/api/workspaces/${workspaceId}/automations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => queryClient.setQueryData(keys.detail(workspaceId, id), data),
  });
}

export function useDeleteAutomation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/workspaces/${workspaceId}/automations/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.list(workspaceId) }),
  });
}

export function useActivateAutomation(workspaceId: string, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<Automation>(`/api/workspaces/${workspaceId}/automations/${id}/activate`, { method: "POST" }),
    onSuccess: (data) => {
      queryClient.setQueryData(keys.detail(workspaceId, id), data);
      queryClient.invalidateQueries({ queryKey: keys.list(workspaceId) });
    },
  });
}

export function usePauseAutomation(workspaceId: string, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<Automation>(`/api/workspaces/${workspaceId}/automations/${id}/pause`, { method: "POST" }),
    onSuccess: (data) => {
      queryClient.setQueryData(keys.detail(workspaceId, id), data);
      queryClient.invalidateQueries({ queryKey: keys.list(workspaceId) });
    },
  });
}

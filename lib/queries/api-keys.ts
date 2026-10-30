"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import type { ApiScope } from "@/lib/api-keys/generate";

export type ApiKeySummary = {
  id: string;
  name: string;
  scopes: ApiScope[];
  createdAt: string;
  lastUsedAt: string | null;
};

export type CreatedApiKey = ApiKeySummary & { rawKey: string };

export function useApiKeys(workspaceId: string) {
  return useQuery({
    queryKey: ["api-keys", workspaceId],
    queryFn: () => apiFetch<ApiKeySummary[]>(`/api/workspaces/${workspaceId}/api-keys`),
  });
}

export function useCreateApiKey(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; scopes: ApiScope[] }) =>
      apiFetch<CreatedApiKey>(`/api/workspaces/${workspaceId}/api-keys`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys", workspaceId] }),
  });
}

export function useRevokeApiKey(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/workspaces/${workspaceId}/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys", workspaceId] }),
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

export type Group = {
  id: string;
  name: string;
  description: string | null;
  subscriberCount: number;
  createdAt?: string;
};

export function useGroups(workspaceId: string) {
  return useQuery({
    queryKey: ["groups", workspaceId],
    queryFn: () => apiFetch<Group[]>(`/api/workspaces/${workspaceId}/groups`),
  });
}

export function useCreateGroup(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) =>
      apiFetch<Group>(`/api/workspaces/${workspaceId}/groups`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups", workspaceId] }),
  });
}

export function useUpdateGroup(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; description?: string }) =>
      apiFetch<Group>(`/api/workspaces/${workspaceId}/groups/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups", workspaceId] }),
  });
}

export function useDeleteGroup(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/workspaces/${workspaceId}/groups/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups", workspaceId] }),
  });
}

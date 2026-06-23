"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

export type Subscriber = {
  id: string;
  email: string;
  status: "SUBSCRIBED" | "UNSUBSCRIBED" | "BOUNCED" | "CLEANED";
  customFields: Record<string, unknown>;
  createdAt: string;
  groups: { id: string; name: string }[];
};

export type SubscriberDetail = Subscriber & {
  unsubscribedAt: string | null;
  activity: {
    id: string;
    campaign: { id: string; subject: string } | null;
    status: string;
    sentAt: string | null;
    events: { type: string; occurredAt: string }[];
  }[];
};

export function useSubscribers(
  workspaceId: string,
  filters: { groupId?: string; status?: string; search?: string }
) {
  const params = new URLSearchParams();
  if (filters.groupId) params.set("groupId", filters.groupId);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);

  return useQuery({
    queryKey: ["subscribers", workspaceId, filters],
    queryFn: () =>
      apiFetch<{ subscribers: Subscriber[]; nextCursor: string | null }>(
        `/api/workspaces/${workspaceId}/subscribers?${params.toString()}`
      ),
  });
}

export function useSubscriber(workspaceId: string, id: string) {
  return useQuery({
    queryKey: ["subscriber", workspaceId, id],
    queryFn: () => apiFetch<SubscriberDetail>(`/api/workspaces/${workspaceId}/subscribers/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateSubscriber(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; groupIds?: string[] }) =>
      apiFetch<Subscriber>(`/api/workspaces/${workspaceId}/subscribers`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscribers", workspaceId] }),
  });
}

export function useUpdateSubscriber(workspaceId: string, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Pick<Subscriber, "email" | "status" | "customFields">>) =>
      apiFetch<Subscriber>(`/api/workspaces/${workspaceId}/subscribers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscribers", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["subscriber", workspaceId, id] });
    },
  });
}

export function useDeleteSubscriber(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/workspaces/${workspaceId}/subscribers/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscribers", workspaceId] }),
  });
}

export function useSetSubscriberGroup(workspaceId: string, subscriberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, add }: { groupId: string; add: boolean }) =>
      apiFetch(`/api/workspaces/${workspaceId}/subscribers/${subscriberId}/groups/${groupId}`, {
        method: add ? "POST" : "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriber", workspaceId, subscriberId] });
      queryClient.invalidateQueries({ queryKey: ["subscribers", workspaceId] });
    },
  });
}

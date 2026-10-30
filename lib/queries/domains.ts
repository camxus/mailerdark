"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

export type DnsStatus = "PENDING" | "VALID" | "INVALID";

export type DnsRecord = {
  record: string;
  name: string;
  value: string;
  type: string;
  ttl: string;
  status: string;
  priority?: number;
};

export type SendingDomain = {
  id: string;
  domain: string;
  spfStatus: DnsStatus;
  dkimStatus: DnsStatus;
  dmarcStatus: DnsStatus;
  verifiedAt: string | null;
  dnsRecords: DnsRecord[] | null;
  createdAt: string;
};

export function useDomains(workspaceId: string) {
  return useQuery({
    queryKey: ["domains", workspaceId],
    queryFn: () => apiFetch<SendingDomain[]>(`/api/workspaces/${workspaceId}/domains`),
  });
}

export function useAddDomain(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (domain: string) =>
      apiFetch<SendingDomain>(`/api/workspaces/${workspaceId}/domains`, {
        method: "POST",
        body: JSON.stringify({ domain }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["domains", workspaceId] }),
  });
}

export function useVerifyDomain(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<SendingDomain>(`/api/workspaces/${workspaceId}/domains/${id}/verify`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["domains", workspaceId] }),
  });
}

export function useDeleteDomain(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/workspaces/${workspaceId}/domains/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["domains", workspaceId] }),
  });
}

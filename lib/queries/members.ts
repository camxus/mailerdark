"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

export type Member = { userId: string; email: string; role: "OWNER" | "ADMIN" | "MEMBER" };

export function useMembers(workspaceId: string) {
  return useQuery({
    queryKey: ["members", workspaceId],
    queryFn: () => apiFetch<Member[]>(`/api/workspaces/${workspaceId}/members`),
  });
}

export function useAddMember(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; role: "ADMIN" | "MEMBER" }) =>
      apiFetch<Member>(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members", workspaceId] }),
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

export type Field = {
  id: string;
  key: string;
  label: string;
  type: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN";
};

export function useFields(workspaceId: string) {
  return useQuery({
    queryKey: ["fields", workspaceId],
    queryFn: () => apiFetch<Field[]>(`/api/workspaces/${workspaceId}/fields`),
  });
}

export function useCreateField(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { key: string; label: string; type: Field["type"] }) =>
      apiFetch<Field>(`/api/workspaces/${workspaceId}/fields`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fields", workspaceId] }),
  });
}

export function useDeleteField(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/workspaces/${workspaceId}/fields/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fields", workspaceId] }),
  });
}

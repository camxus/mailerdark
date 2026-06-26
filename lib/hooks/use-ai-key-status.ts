import { useState, useEffect } from "react";

export function useAiKeyStatus(workspaceId: string): boolean | null {
  const [hasAiKey, setHasAiKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAiKey = async () => {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/settings/ai`, {
          headers: { "Content-Type": "application/json" },
        });
        const settings = await res.json();
        const hasKey = Boolean(settings?.openRouterKeySet || settings?.customKeySet);
        setHasAiKey(hasKey);
      } catch {
        setHasAiKey(false);
      }
    };
    checkAiKey();
  }, [workspaceId]);

  return hasAiKey;
}

export function useCmdK(onOpen: () => void): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpen]);
}
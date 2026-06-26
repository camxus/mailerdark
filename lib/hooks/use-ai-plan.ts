import { useState, useCallback } from "react";
import type { AIPlan, VerificationState } from "@/lib/ai/types";
import { submitCommand as submitCommandApi, submitVerification as submitVerificationApi } from "@/lib/hooks/use-ai-command";

export type UseSessionState = {
  plan: AIPlan | null;
  questions: VerificationState["questions"];
  answers: Record<string, string | string[]>;
};

export function useAIPlan(workspaceId: string) {
  const [state, setState] = useState<UseSessionState>({ plan: null, questions: [], answers: {} });
  const [loading, setLoading] = useState(false);

  const submitCommand = useCallback(async (command: string) => {
    setLoading(true);
    try {
      const result = await submitCommandApi(workspaceId, command);
      if (result.status === "needs_clarification" && result.session) {
        setState({
          plan: result.session.plan,
          questions: result.questions || [],
          answers: {},
        });
        return { needsClarification: true as const };
      }
      return { success: true as const, result: result.result };
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const submitVerification = useCallback(async (answers: Record<string, string | string[]>) => {
    if (!state.plan) return { error: "No plan" };
    setLoading(true);
    try {
      const result = await submitVerificationApi(workspaceId, "", state.plan, state.questions, answers);
      if (result.status === "success") {
        setState({ plan: null, questions: [], answers: {} });
        return { success: true as const, result: result.result };
      }
      return { error: "Verification failed" };
    } finally {
      setLoading(false);
    }
  }, [workspaceId, state.plan, state.questions]);

  const reset = useCallback(() => {
    setState({ plan: null, questions: [], answers: {} });
  }, []);

  return {
    ...state,
    loading,
    submitCommand,
    submitVerification,
    reset,
  };
}
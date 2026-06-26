import type { VerificationQuestion, VerificationState } from "@/lib/ai/types";

export type CommandResult = {
  status: "success" | "needs_clarification" | "streaming" | "error";
  result?: { id: string; name: string };
  session?: VerificationState;
  questions?: VerificationQuestion[];
  error?: string;
};

export async function submitCommand(workspaceId: string, command: string): Promise<CommandResult> {
  if (!command.trim()) return { status: "error", error: "Empty command" };

  // Try streaming endpoint first
  const streamRes = await fetch(`/api/workspaces/${workspaceId}/ai/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command }),
  });

  if (streamRes.ok && streamRes.headers.get("Content-Type")?.includes("text/event-stream")) {
    const reader = streamRes.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      let finalData: CommandResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.status === "analyzing" || data.status === "planning") {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("ai-streaming", { detail: data.message }));
                }
              } else if (data.status === "executing" || data.status === "complete") {
                finalData = { status: "success", result: data.result };
              } else if (data.status === "needs_clarification") {
                finalData = {
                  status: "needs_clarification",
                  questions: data.questions,
                  session: { sessionId: data.sessionId, plan: data.plan, questions: data.questions },
                };
              }
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }

      return finalData || { status: "error", error: "No response" };
    }
  }

  throw new Error("No response from AI");
}

export async function submitVerification(
  workspaceId: string,
  sessionId: string,
  plan: VerificationState["plan"],
  questions: VerificationState["questions"],
  answers: Record<string, string | string[]>
): Promise<CommandResult> {
  const res = await fetch(`/api/workspaces/${workspaceId}/ai/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, plan, collectedValues: {}, answers }),
  });

  const data = await res.json();

  if (data.status === "success") {
    return { status: "success", result: data.result, session: data.session };
  }

  return { status: "error", error: "Verification failed" };
}
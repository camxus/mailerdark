"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAiKeyStatus } from "@/lib/hooks/use-ai-key-status";
import { useAIPlan } from "@/lib/hooks/use-ai-plan";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

export function FloatingInput({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAiKey = useAiKeyStatus(workspaceId);

  const {
    plan,
    questions,
    loading,
    submitCommand,
    submitVerification,
  } = useAIPlan(workspaceId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (questions.length > 0) return;

    const form = e.target as HTMLFormElement;
    const input = form.querySelector("input") as HTMLInputElement;
    const command = input?.value || "";

    if (command.trim()) {
      input.value = "";
      setChatHistory((prev) => [...prev, { role: "user", content: command }]);

      const result = await submitCommand(command);

      if (result.success && result.result) {
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", content: `Created ${result.result?.name}` },
        ]);
      } else if (result.needsClarification) {
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", content: "I need a few more details..." },
        ]);
      }
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;

    const form = e.target as HTMLFormElement;
    const inputs = Array.from(form.querySelectorAll("input, select, textarea"));

    const answers: Record<string, string | string[]> = {};
    questions.forEach((q, i) => {
      const input = inputs[i] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (q.type === "multiselect") {
        const checkboxes = form.querySelectorAll(`input[type="checkbox"][data-question="${q.id}"]`);
        answers[q.id] = Array.from(checkboxes)
          .filter((cb) => (cb as HTMLInputElement).checked)
          .map((cb) => (cb as HTMLInputElement).value);
      } else {
        answers[q.id] = input?.value || "";
      }
    });

    const result = await submitVerification(answers);

    if (result.success) {
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: `Created ${result.result?.name}` },
      ]);
      setOpen(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 shadow-lg hover:bg-canvas z-50"
            title="Open AI Assistant (⌘K)"
          >
            <span className="text-sm font-medium text-ink">Ask AI...</span>
            <kbd className="rounded bg-canvas px-1.5 py-0.5 text-xs text-ink-soft">⌘K</kbd>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ clipPath: "circle(0% at 50% 100%)" }}
            animate={{ clipPath: "circle(150% at 50% 100%)" }}
            exit={{ clipPath: "circle(0% at 50% 100%)" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 z-40"
            style={{
              background: "radial-gradient(ellipse at bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%)",
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-32 left-0 right-0 z-50 mx-auto max-w-2xl px-6"
          >
            {chatHistory.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}
              >
                <span className={`inline-block rounded-lg px-4 py-2 ${msg.role === "user" ? "bg-teal text-white" : "bg-canvas border border-line"}`}>
                  {msg.content}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-0 right-0 z-50 mx-auto max-w-2xl px-6"
          >
            {hasAiKey === false && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-lg border border-line bg-surface p-6 max-w-md mx-4 text-center"
                >
                  <h3 className="text-lg font-semibold text-ink mb-2">AI Assistant Unavailable</h3>
                  <p className="text-sm text-ink-soft mb-4">
                    No AI API key configured. Connect OpenRouter or a custom provider to enable AI features.
                  </p>
                  <a
                    href={`/w/${workspaceId}/settings/ai`}
                    className="inline-block rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
                  >
                    Configure AI Integration
                  </a>
                  <button
                    onClick={() => setOpen(false)}
                    className="ml-2 rounded-md px-4 py-2 text-sm font-medium text-ink-soft hover:bg-canvas"
                  >
                    Close
                  </button>
                </motion.div>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                defaultValue=""
                placeholder='Ask AI... (e.g., "Create a welcome campaign for premium users")'
                disabled={loading}
                className="flex-1 rounded-lg border border-line bg-surface px-4 py-3 text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-teal"
              />
              <Button type="submit" disabled={loading}>
                {loading ? "..." : "Send"}
              </Button>
            </form>

            {questions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full mb-2 w-full rounded-lg border border-line bg-surface p-4 shadow-lg"
              >
                <form onSubmit={handleVerificationSubmit}>
                  {questions.map((q) => (
                    <div key={q.id} className="mb-3">
                      <label className="block text-sm font-medium mb-1">{q.label}</label>
                      {q.type === "select" ? (
                        <select className="w-full rounded border p-2" data-question={q.id}>
                          <option value="">Choose...</option>
                          {q.options?.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : q.type === "multiselect" ? (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {q.options?.map((opt) => (
                            <label key={opt} className="flex items-center gap-2 text-sm">
                              <input type="checkbox" value={opt} data-question={q.id} />
                              {opt}
                            </label>
                          ))}
                        </div>
                      ) : q.type === "textarea" ? (
                        <textarea className="w-full rounded border p-2" rows={3} data-question={q.id} />
                      ) : q.type === "number" ? (
                        <input type="number" className="w-full rounded border p-2" data-question={q.id} />
                      ) : q.type === "date" ? (
                        <input type="date" className="w-full rounded border p-2" data-question={q.id} />
                      ) : (
                        <input type="text" className="w-full rounded border p-2" data-question={q.id} />
                      )}
                    </div>
                  ))}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      Confirm
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

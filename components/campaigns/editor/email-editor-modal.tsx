"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { SplitEditorPane } from "./split-editor-pane";

export function EmailEditorModal({
  title,
  value,
  onChange,
  onClose,
  workspaceId,
  disabled = false,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  workspaceId?: string;
  disabled?: boolean;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-6">
      <div className="flex h-[92vh] w-full max-w-7xl flex-col rounded-lg border border-line bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-soft hover:bg-canvas">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-hidden p-2">
          <div className="h-full overflow-hidden rounded-md border border-line">
            <SplitEditorPane
              workspaceId={workspaceId ?? ""}
              value={value}
              onChange={onChange}
              disabled={disabled}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

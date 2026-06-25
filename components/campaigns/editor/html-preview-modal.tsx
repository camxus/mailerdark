"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function HtmlPreviewModal({
  value,
  onClose,
}: {
  value: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40" onClick={onClose}>
      <div
        className="w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col rounded-lg border border-line bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-base font-semibold text-ink">Preview</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-soft hover:bg-canvas">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-canvas p-4">
          <div className="mx-auto bg-white rounded shadow-sm">
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={value}
              className="w-full border-0"
              style={{ minHeight: "500px", display: "block" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

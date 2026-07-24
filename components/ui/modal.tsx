"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-lg border border-line bg-surface sm:max-w-md shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-soft hover:bg-canvas">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

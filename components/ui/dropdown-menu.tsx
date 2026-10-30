"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";

export type DropdownMenuItem = {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

export function DropdownMenu({
  trigger,
  items,
  align = "right",
}: {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div
          className={cx(
            "absolute top-full z-20 mt-1 w-64 rounded-md border border-line bg-surface py-1 shadow-md",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              disabled={item.disabled}
              className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
            >
              {item.icon && <span className="mt-0.5 shrink-0 text-ink-soft">{item.icon}</span>}
              <span>
                <span className="block text-sm text-ink">{item.label}</span>
                {item.description && (
                  <span className="block text-xs text-ink-soft">{item.description}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

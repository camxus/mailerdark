"use client";

import { Handle, Position } from "@xyflow/react";
import { cx } from "@/lib/cx";

export function NodeShell({
  label,
  icon,
  accent,
  children,
  hasInput = true,
  hasOutput = true,
  yesNo = false,
}: {
  label: string;
  icon: string;
  accent: "teal" | "amber" | "green" | "red" | "neutral";
  children?: React.ReactNode;
  hasInput?: boolean;
  hasOutput?: boolean;
  yesNo?: boolean;
}) {
  const accentClasses: Record<string, string> = {
    teal: "border-teal bg-teal-soft text-teal-dark",
    amber: "border-amber bg-amber-soft text-amber",
    green: "border-green bg-green-soft text-green",
    red: "border-red bg-red-soft text-red",
    neutral: "border-line bg-canvas text-ink",
  };

  return (
    <div className={cx("min-w-[180px] rounded-lg border-2 bg-surface shadow-sm", accentClasses[accent])}>
      {hasInput && (
        <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-current !border-2 !border-surface" />
      )}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      {children && (
        <div className="border-t border-current/20 px-3 py-2 text-xs">{children}</div>
      )}
      {hasOutput && !yesNo && (
        <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-current !border-2 !border-surface" />
      )}
      {yesNo && (
        <>
          <Handle id="yes" type="source" position={Position.Bottom} style={{ left: "30%" }}
            className="!w-3 !h-3 !bg-green !border-2 !border-surface" />
          <Handle id="no" type="source" position={Position.Bottom} style={{ left: "70%" }}
            className="!w-3 !h-3 !bg-red !border-2 !border-surface" />
          <div className="flex justify-between px-4 pb-1.5 text-[10px]">
            <span className="text-green font-semibold">Yes</span>
            <span className="text-red font-semibold">No</span>
          </div>
        </>
      )}
    </div>
  );
}

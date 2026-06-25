"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Code2, Wand2, Eye, Monitor, Tablet, Smartphone,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
} from "lucide-react";
import { cx } from "@/lib/cx";
import { SnippetsSidebar } from "./snippets-sidebar";
import { AiEditorPanel } from "../ai-editor/ai-editor-panel";

const HtmlEditor = dynamic(
  () => import("@/components/ui/html-editor").then((m) => m.HtmlEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-xs text-ink-soft">
        Loading editor…
      </div>
    ),
  }
);

type EditorTab = "code" | "ai";
type PreviewSize = "desktop" | "tablet" | "mobile";

const previewSizes: { id: PreviewSize; label: string; icon: React.ElementType; maxWidth: string }[] = [
  { id: "desktop", label: "Desktop", icon: Monitor, maxWidth: "100%" },
  { id: "tablet", label: "Tablet", icon: Tablet, maxWidth: "768px" },
  { id: "mobile", label: "Mobile", icon: Smartphone, maxWidth: "375px" },
];

export function SplitEditorPane({
  workspaceId,
  value,
  onChange,
  previewHtml,
  disabled,
  className,
}: {
  workspaceId: string;
  value: string;
  onChange: (v: string) => void;
  previewHtml?: string | null;
  disabled?: boolean;
  className?: string;
}) {
  const [tab, setTab] = useState<EditorTab>("code");
  const [showSnippets, setShowSnippets] = useState(true);
  const [showEditor, setShowEditor] = useState(true);
  const [previewSize, setPreviewSize] = useState<PreviewSize>("desktop");
  const editorInsertRef = useRef<((code: string) => void) | null>(null);

  const activeSize = previewSizes.find((s) => s.id === previewSize)!;

  const handleSnippetInsert = useCallback((code: string) => {
    if (editorInsertRef.current) {
      editorInsertRef.current(code);
    } else {
      onChange(value + "\n" + code);
    }
  }, [onChange, value]);

  function handleAiApply(html: string) {
    onChange(html);
    setTab("code");
  }

  return (
    <div className={cx("flex h-[620px] overflow-hidden rounded-lg border border-line", className)}>
      {/* ── Snippets sidebar ── */}
      {showSnippets && !disabled && (
        <SnippetsSidebar workspaceId={workspaceId} onInsert={handleSnippetInsert} />
      )}

      {/* ── Preview pane ── */}
      <div className={cx("flex flex-1 flex-col min-w-0", !showEditor && "border-r-0")}>
        <div className="flex items-center gap-2 border-b border-line bg-canvas px-3 py-1.5">
          <Eye size={13} className="text-ink-soft" />
          <span className="text-xs font-medium text-ink-soft">Preview</span>
          <div className="ml-auto flex items-center gap-1">
            {previewSizes.map((size) => (
              <button
                key={size.id}
                onClick={() => setPreviewSize(size.id)}
                title={size.label}
                className={cx(
                  "rounded px-1.5 py-0.5 text-xs transition-colors",
                  previewSize === size.id
                    ? "bg-teal-soft text-teal-dark"
                    : "text-ink-soft hover:text-ink hover:bg-surface"
                )}
              >
                <size.icon size={13} />
              </button>
            ))}
          </div>
          {!disabled && (
            <button
              onClick={() => setShowSnippets((v) => !v)}
              className="ml-1 rounded p-1 text-ink-soft hover:bg-surface"
              title={showSnippets ? "Hide snippets" : "Show snippets"}
            >
              {showSnippets
                ? <PanelLeftClose size={13} />
                : <PanelLeftOpen size={13} />}
            </button>
          )}
          <button
            onClick={() => setShowEditor((v) => !v)}
            className="ml-1 rounded p-1 text-ink-soft hover:bg-surface"
            title={showEditor ? "Collapse editor" : "Expand editor"}
          >
            {showEditor
              ? <PanelRightClose size={13} />
              : <PanelRightOpen size={13} />}
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-canvas">
          <div className="flex h-full items-center justify-center" style={{ maxWidth: activeSize.maxWidth, margin: "0 auto" }}>
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={previewHtml ?? value}
              className="border-0 bg-white"
              style={{ width: activeSize.maxWidth, maxWidth: "100%" }}
            />
          </div>
        </div>
      </div>

      {/* ── Code / AI editor pane ── */}
      {showEditor && (
        <div className="flex w-[52%] flex-col min-w-0">
          {/* Tab bar */}
          <div className="flex items-center border-b border-line bg-surface">
            {([
              { id: "code", label: "HTML", icon: Code2 },
              { id: "ai", label: "AI Editor", icon: Wand2 },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cx(
                  "flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors",
                  tab === id
                    ? "border-b-2 border-teal text-teal-dark bg-teal-soft/40"
                    : "text-ink-soft hover:text-ink hover:bg-canvas"
                )}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Editor panels */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className={cx("flex-1 overflow-hidden", tab !== "code" && "hidden")}>
              <HtmlEditor
                value={value}
                onChange={onChange}
                disabled={disabled}
                minHeight="100%"
                onInsertRef={editorInsertRef}
              />
            </div>
            {tab === "ai" && (
              <AiEditorPanel
                workspaceId={workspaceId}
                currentHtml={value}
                onApply={handleAiApply}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
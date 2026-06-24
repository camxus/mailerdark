"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Code2, Wand2, Eye, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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

export function SplitEditorPane({
  workspaceId,
  value,
  onChange,
  previewHtml,
  disabled,
}: {
  workspaceId: string;
  value: string;
  onChange: (v: string) => void;
  previewHtml: string | null;
  disabled?: boolean;
}) {
  const [tab, setTab] = useState<EditorTab>("code");
  const [showSnippets, setShowSnippets] = useState(true);
  const editorInsertRef = useRef<((code: string) => void) | null>(null);

  // Called by the snippets sidebar — inserts at cursor if the code editor
  // exposes a ref, otherwise appends to the end.
  const handleSnippetInsert = useCallback((code: string) => {
    if (editorInsertRef.current) {
      editorInsertRef.current(code);
    } else {
      onChange(value + "\n" + code);
    }
  }, [onChange, value]);

  // Called by the AI panel when the user clicks "Apply to editor"
  function handleAiApply(html: string) {
    onChange(html);
    setTab("code");
  }

  return (
    <div className="flex h-[620px] overflow-hidden rounded-lg border border-line">
      {/* ── Snippets sidebar ── */}
      {showSnippets && !disabled && (
        <SnippetsSidebar workspaceId={workspaceId} onInsert={handleSnippetInsert} />
      )}

      {/* ── Preview pane ── */}
      <div className="flex flex-1 flex-col border-r border-line min-w-0">
        <div className="flex items-center gap-2 border-b border-line bg-canvas px-3 py-1.5">
          <Eye size={13} className="text-ink-soft" />
          <span className="text-xs font-medium text-ink-soft">Preview</span>
          {!disabled && (
            <button
              onClick={() => setShowSnippets((v) => !v)}
              className="ml-auto rounded p-1 text-ink-soft hover:bg-surface"
              title={showSnippets ? "Hide snippets" : "Show snippets"}
            >
              {showSnippets
                ? <PanelLeftClose size={13} />
                : <PanelLeftOpen size={13} />}
            </button>
          )}
        </div>
        <iframe
          title="Email preview"
          sandbox=""
          srcDoc={previewHtml ?? value}
          className="flex-1 w-full bg-white"
        />
      </div>

      {/* ── Code / AI editor pane ── */}
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
    </div>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Code2,
  Wand2,
  Eye,
  Monitor,
  Tablet,
  Smartphone,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
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

const previewSizes: {
  id: PreviewSize;
  label: string;
  icon: React.ElementType;
  maxWidth: string;
}[] = [
  {
    id: "desktop",
    label: "Desktop",
    icon: Monitor,
    maxWidth: "100%",
  },
  {
    id: "tablet",
    label: "Tablet",
    icon: Tablet,
    maxWidth: "768px",
  },
  {
    id: "mobile",
    label: "Mobile",
    icon: Smartphone,
    maxWidth: "375px",
  },
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
  const [showSnippetsMobile, setShowSnippetsMobile] = useState(false);
  const [showEditor, setShowEditor] = useState(true);
  const [previewSize, setPreviewSize] =
    useState<PreviewSize>("desktop");

  const editorInsertRef = useRef<((code: string) => void) | null>(null);

  const activeSize = previewSizes.find(
    (s) => s.id === previewSize
  )!;

  const handleSnippetInsert = useCallback(
    (code: string) => {
      if (editorInsertRef.current) {
        editorInsertRef.current(code);
      } else {
        onChange(value + "\n" + code);
      }
    },
    [onChange, value]
  );

  function handleAiApply(html: string) {
    onChange(html);
    setTab("code");
  }

  return (
    <div
      className={cx(
        "relative flex h-[500px] overflow-hidden rounded-xl border border-line bg-canvas shadow-sm sm:h-[620px]",
        className
      )}
    >
      {/* ─────────────────────────────────────────────
          Snippets sidebar
      ───────────────────────────────────────────── */}
      {showSnippets && !disabled && (
        <div
          className={cx(
            "absolute inset-y-0 left-0 z-30 flex w-full flex-col border-r border-line bg-surface shadow-xl transition-transform sm:static sm:z-auto sm:w-64 sm:shadow-none",
            showSnippetsMobile ? "flex" : "hidden sm:flex"
          )}
        >
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
              Snippets
            </span>

            <button
              onClick={() => setShowSnippetsMobile(false)}
              className="rounded-md p-1 text-ink-soft transition-colors hover:bg-canvas hover:text-ink sm:hidden"
              title="Close snippets"
            >
              <PanelLeftClose size={14} />
            </button>
          </div>

          <div className="min-h-0 flex-1">
            <SnippetsSidebar
              workspaceId={workspaceId}
              onInsert={handleSnippetInsert}
            />
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          Preview
      ───────────────────────────────────────────── */}
      <div
        className={cx(
          "flex min-w-0 flex-1 flex-col",
          showEditor && "border-r border-line"
        )}
      >
        {/* Preview toolbar */}
        <div className="flex min-h-11 shrink-0 items-center justify-between gap-2 border-b border-line bg-surface px-2.5 sm:px-3">
          <div className="flex min-w-0 items-center gap-2">
            {!disabled && (
              <button
                onClick={() =>
                  setShowSnippetsMobile((v) => !v)
                }
                className="rounded-md p-1.5 text-ink-soft transition-colors hover:bg-canvas hover:text-ink sm:hidden"
                title={
                  showSnippetsMobile
                    ? "Hide snippets"
                    : "Show snippets"
                }
              >
                {showSnippetsMobile ? (
                  <PanelLeftClose size={14} />
                ) : (
                  <PanelLeftOpen size={14} />
                )}
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <Eye size={14} className="text-ink-soft" />
              <span className="text-xs font-semibold text-ink">
                Preview
              </span>
            </div>
          </div>

          {/* Device selector */}
          <div className="flex items-center gap-0.5 rounded-lg border border-line bg-canvas p-0.5">
            {previewSizes.map((size) => {
              const Icon = size.icon;
              const active = previewSize === size.id;

              return (
                <button
                  key={size.id}
                  onClick={() => setPreviewSize(size.id)}
                  title={size.label}
                  aria-label={size.label}
                  className={cx(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-all",
                    active
                      ? "bg-surface text-ink shadow-sm ring-1 ring-line"
                      : "text-ink-soft hover:text-ink"
                  )}
                >
                  <Icon size={13} />
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1">
            {!disabled && (
              <button
                onClick={() => setShowSnippets((v) => !v)}
                className="hidden rounded-md p-1.5 text-ink-soft transition-colors hover:bg-canvas hover:text-ink sm:block"
                title={
                  showSnippets
                    ? "Hide snippets"
                    : "Show snippets"
                }
              >
                {showSnippets ? (
                  <PanelLeftClose size={14} />
                ) : (
                  <PanelLeftOpen size={14} />
                )}
              </button>
            )}

            <button
              onClick={() => setShowEditor((v) => !v)}
              className="rounded-md p-1.5 text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
              title={
                showEditor
                  ? "Collapse editor"
                  : "Expand editor"
              }
            >
              {showEditor ? (
                <PanelRightClose size={14} />
              ) : (
                <PanelRightOpen size={14} />
              )}
            </button>
          </div>
        </div>

        {/* Preview canvas */}
        <div className="relative min-h-0 flex-1 overflow-auto bg-canvas">
          {/* subtle workspace grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle, currentColor 0.7px, transparent 0.7px)",
              backgroundSize: "18px 18px",
              color: "var(--line)",
            }}
          />

          <div className="relative flex min-h-full w-full items-start justify-center p-4 sm:p-6">
            <div
              className={cx(
                "min-h-full overflow-hidden bg-white shadow-md ring-1 ring-black/5 transition-[width,max-width] duration-200",
                previewSize === "desktop"
                  ? "w-full"
                  : "w-full"
              )}
              style={{
                maxWidth: activeSize.maxWidth,
              }}
            >
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={previewHtml ?? value}
                className="block h-full min-h-[400px] w-full border-0 bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────
          Code / AI editor
      ───────────────────────────────────────────── */}
      {showEditor && (
        <div className="flex w-full min-w-0 flex-col bg-surface sm:w-[52%]">
          {/* Editor toolbar */}
          <div className="flex h-11 shrink-0 items-end border-b border-line bg-surface px-2">
            <div className="flex h-full items-end gap-0.5">
              {(
                [
                  {
                    id: "code",
                    label: "HTML",
                    icon: Code2,
                  },
                  {
                    id: "ai",
                    label: "AI Editor",
                    icon: Wand2,
                  },
                ] as const
              ).map(({ id, label, icon: Icon }) => {
                const active = tab === id;

                return (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={cx(
                      "relative flex h-full items-center gap-1.5 px-3 text-xs font-medium transition-colors sm:px-4",
                      active
                        ? "text-ink"
                        : "text-ink-soft hover:text-ink"
                    )}
                  >
                    <Icon
                      size={13}
                      className={cx(
                        active && "text-teal"
                      )}
                    />

                    {label}

                    {active && (
                      <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-teal" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editor content */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <div
              className={cx(
                "h-full overflow-hidden",
                tab !== "code" && "hidden"
              )}
            >
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

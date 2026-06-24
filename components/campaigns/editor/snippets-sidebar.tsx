"use client";

import { useState } from "react";
import { Search, Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { useFields } from "@/lib/queries/fields";
import { staticSnippets, fieldSnippets, snippetCategories, type Snippet } from "@/lib/email/snippets";
import { cx } from "@/lib/cx";

export function SnippetsSidebar({
  workspaceId,
  onInsert,
}: {
  workspaceId: string;
  /** Called with the snippet HTML so the parent can insert it into the editor */
  onInsert: (code: string) => void;
}) {
  const { data: fields } = useFields(workspaceId);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const dynamic = fields ? fieldSnippets(fields) : [];
  // Skip the built-in {{email}} since it's already in staticSnippets
  const allSnippets = [...staticSnippets, ...dynamic.filter((s) => s.id !== "merge-email")];
  const filtered = search.trim()
    ? allSnippets.filter(
        (s) =>
          s.label.toLowerCase().includes(search.toLowerCase()) ||
          s.description.toLowerCase().includes(search.toLowerCase())
      )
    : allSnippets;

  async function handleCopy(snippet: Snippet) {
    await navigator.clipboard.writeText(snippet.code);
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function toggleCategory(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <aside className="flex w-56 flex-col border-r border-line bg-surface overflow-hidden">
      <div className="border-b border-line p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">Snippets</p>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-md border border-line bg-canvas py-1.5 pl-7 pr-2 text-xs text-ink placeholder:text-ink-soft/60 focus:outline-1 focus:outline-teal"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {search.trim() ? (
          // Flat search results
          <ul className="divide-y divide-line">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-xs text-ink-soft">No snippets match.</li>
            ) : (
              filtered.map((s) => (
                <SnippetRow
                  key={s.id}
                  snippet={s}
                  copied={copiedId === s.id}
                  onInsert={() => onInsert(s.code)}
                  onCopy={() => handleCopy(s)}
                />
              ))
            )}
          </ul>
        ) : (
          // Grouped by category
          snippetCategories.map((cat) => {
            const items = filtered.filter((s) => s.category === cat.id);
            if (items.length === 0) return null;
            const isCollapsed = collapsed.has(cat.id);
            return (
              <div key={cat.id}>
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-canvas uppercase tracking-wider"
                >
                  {cat.label}
                  {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </button>
                {!isCollapsed && (
                  <ul className="divide-y divide-line">
                    {items.map((s) => (
                      <SnippetRow
                        key={s.id}
                        snippet={s}
                        copied={copiedId === s.id}
                        onInsert={() => onInsert(s.code)}
                        onCopy={() => handleCopy(s)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

function SnippetRow({
  snippet,
  copied,
  onInsert,
  onCopy,
}: {
  snippet: Snippet;
  copied: boolean;
  onInsert: () => void;
  onCopy: () => void;
}) {
  const categoryColor: Record<string, string> = {
    merge: "text-teal-dark bg-teal-soft",
    tracking: "text-amber bg-amber-soft",
    block: "text-ink-soft bg-canvas",
    layout: "text-ink-soft bg-canvas",
  };

  return (
    <li className="group px-3 py-2 hover:bg-canvas">
      <div className="flex items-start justify-between gap-1">
        <button
          onClick={onInsert}
          className="flex-1 text-left"
          title="Click to insert into editor"
        >
          <p className={cx(
            "inline-block rounded px-1 py-0.5 font-mono text-xs font-medium leading-tight",
            categoryColor[snippet.category]
          )}>
            {snippet.label}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-ink-soft line-clamp-2">
            {snippet.description}
          </p>
        </button>
        <button
          onClick={onCopy}
          className="shrink-0 rounded p-1 text-ink-soft opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface"
          title="Copy to clipboard"
        >
          {copied ? <Check size={12} className="text-green" /> : <Copy size={12} />}
        </button>
      </div>
    </li>
  );
}

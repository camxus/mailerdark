"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { automationTemplates, automationTemplateCategories, type AutomationTemplate } from "@/lib/templates/automation-templates";

export function AutomationTemplateSelector({
  onSelect,
  onClose,
}: {
  onSelect: (template: AutomationTemplate | null) => void;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>("scratch");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredTemplates = activeCategory
    ? automationTemplates.filter((t) => t.category === activeCategory)
    : automationTemplates;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="flex h-[500px] w-full max-w-3xl flex-col rounded-lg border border-line bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-base font-semibold text-ink">Choose an automation template</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-soft hover:bg-canvas">
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-line">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-2 text-sm font-medium ${
              activeCategory === null ? "border-b-2 border-teal text-teal-dark" : "text-ink-soft hover:text-ink"
            }`}
          >
            All
          </button>
          {automationTemplateCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-2 text-sm font-medium capitalize ${
                activeCategory === cat.id ? "border-b-2 border-teal text-teal-dark" : "text-ink-soft hover:text-ink"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedId("scratch")}
              className={`rounded-lg border p-3 text-left transition-all ${
                selectedId === "scratch" ? "border-teal bg-teal-soft" : "border-line hover:bg-canvas"
              }`}
            >
              <div className="mb-2 flex h-24 items-center justify-center rounded bg-canvas">
                <div className="text-center">
                  <div className="mb-1 text-xs font-medium text-ink">Start from scratch</div>
                  <div className="text-ink-soft" style={{ fontSize: 24 }}>+</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedId === "scratch" && <Check size={14} className="text-teal" />}
                <span className={`text-sm font-medium ${selectedId === "scratch" ? "text-teal-dark" : "text-ink"}`}>
                  Start from scratch
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-soft">Create an empty automation flow</p>
            </button>

            {filteredTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  selectedId === t.id ? "border-teal bg-teal-soft" : "border-line hover:bg-canvas"
                }`}
              >
                <div className="mb-2 h-24 rounded bg-canvas p-2">
                  <div className="text-xs text-ink">{t.name}</div>
                  <div className="mt-1 text-ink-soft" style={{ fontSize: 10 }}>
                    {t.flowDefinition.nodes.length} nodes
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedId === t.id && <Check size={14} className="text-teal" />}
                  <span className={`text-sm font-medium ${selectedId === t.id ? "text-teal-dark" : "text-ink"}`}>
                    {t.name}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-soft">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-line p-4">
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const tmpl = selectedId === "scratch" ? null : automationTemplates.find((t) => t.id === selectedId) ?? null;
                onSelect(tmpl);
              }}
              className="rounded-md bg-teal px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-dark"
            >
              Use template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
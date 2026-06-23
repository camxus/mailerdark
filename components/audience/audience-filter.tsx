"use client";

import { Plus, X, Lock, UserPlus } from "lucide-react";
import { useGroups } from "@/lib/queries/groups";
import { useFields } from "@/lib/queries/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type FieldFilter = {
  fieldKey: string;
  operator: "equals" | "not_equals" | "contains" | "gt" | "lt" | "is_set" | "is_not_set";
  value?: unknown;
};

export type AudienceValue = {
  groupIds?: string[];
  fieldFilters?: FieldFilter[];
  subscriberIds?: string[];
  joinedAfter?: string;
};

const operatorLabels: Record<FieldFilter["operator"], string> = {
  equals: "is",
  not_equals: "is not",
  contains: "contains",
  gt: "is greater than",
  lt: "is less than",
  is_set: "is set",
  is_not_set: "is not set",
};

export function AudienceFilter({
  workspaceId,
  value,
  onChange,
}: {
  workspaceId: string;
  value: AudienceValue;
  onChange: (next: AudienceValue) => void;
}) {
  const { data: groups } = useGroups(workspaceId);
  const { data: fields } = useFields(workspaceId);

  const groupIds = value.groupIds ?? [];
  const fieldFilters = value.fieldFilters ?? [];

  function toggleGroup(groupId: string) {
    const next = groupIds.includes(groupId)
      ? groupIds.filter((id) => id !== groupId)
      : [...groupIds, groupId];
    onChange({ ...value, groupIds: next });
  }

  function updateFilter(index: number, patch: Partial<FieldFilter>) {
    const next = fieldFilters.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange({ ...value, fieldFilters: next });
  }

  function addFilter() {
    if (!fields || fields.length === 0) return;
    onChange({
      ...value,
      fieldFilters: [...fieldFilters, { fieldKey: fields[0].key, operator: "equals", value: "" }],
    });
  }

  function removeFilter(index: number) {
    onChange({ ...value, fieldFilters: fieldFilters.filter((_, i) => i !== index) });
  }

  // A frozen exact recipient list (set by "Resend to non-openers") replaces
  // live targeting entirely — editing group/field filters alongside a fixed
  // list of specific people would be confusing, so show only this banner
  // until it's explicitly cleared.
  if (value.subscriberIds && value.subscriberIds.length > 0) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-line bg-canvas p-3">
        <Lock size={16} className="mt-0.5 shrink-0 text-ink-soft" />
        <div className="flex-1">
          <p className="text-sm font-medium text-ink">
            Exact list of {value.subscriberIds.length} subscriber{value.subscriberIds.length !== 1 ? "s" : ""}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            Snapshotted when this resend was created — it won&apos;t change even if subscribers&apos; group or field
            values change before this sends.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="!px-2 !py-1 text-xs"
          onClick={() => onChange({ ...value, subscriberIds: undefined, joinedAfter: undefined })}
        >
          Use group/field targeting instead
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {value.joinedAfter && (
        <div className="flex items-start gap-3 rounded-md border border-line bg-canvas p-3">
          <UserPlus size={16} className="mt-0.5 shrink-0 text-ink-soft" />
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">
              Only subscribers who joined after {new Date(value.joinedAfter).toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              Set by &quot;Resend to new subscribers&quot; — combined with any group/field targeting below.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...value, joinedAfter: undefined })}
            className="shrink-0 rounded p-1 text-ink-soft hover:bg-surface"
            title="Remove this restriction"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div>
        <p className="mb-2 text-sm font-medium text-ink">Send to groups</p>
        {!groups || groups.length === 0 ? (
          <p className="text-sm text-ink-soft">
            No groups yet — leaving this empty sends to every subscribed contact.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => {
              const checked = groupIds.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    checked
                      ? "border-teal bg-teal-soft text-teal-dark"
                      : "border-line bg-surface text-ink-soft hover:bg-canvas"
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-1.5 text-xs text-ink-soft">
          {groupIds.length === 0 ? "Everyone subscribed" : "Anyone in at least one selected group"}
        </p>
      </div>

      {fields && fields.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Match by field</p>
            <Button type="button" variant="ghost" onClick={addFilter} className="!px-2 !py-1 text-xs">
              <Plus size={13} /> Add condition
            </Button>
          </div>
          {fieldFilters.length === 0 ? (
            <p className="text-sm text-ink-soft">No field conditions — every group member qualifies.</p>
          ) : (
            <div className="space-y-2">
              {fieldFilters.map((filter, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={filter.fieldKey}
                    onChange={(e) => updateFilter(index, { fieldKey: e.target.value })}
                    className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
                  >
                    {fields.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filter.operator}
                    onChange={(e) =>
                      updateFilter(index, { operator: e.target.value as FieldFilter["operator"] })
                    }
                    className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
                  >
                    {Object.entries(operatorLabels).map(([op, label]) => (
                      <option key={op} value={op}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {filter.operator !== "is_set" && filter.operator !== "is_not_set" && (
                    <Input
                      value={String(filter.value ?? "")}
                      onChange={(e) => updateFilter(index, { value: e.target.value })}
                      className="!py-1.5"
                      placeholder="Value"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFilter(index)}
                    className="rounded-md p-1.5 text-ink-soft hover:bg-red-soft hover:text-red"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

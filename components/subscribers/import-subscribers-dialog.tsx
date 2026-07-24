"use client";

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { useImportSubscribers } from "@/lib/queries/subscribers";
import { useGroups } from "@/lib/queries/groups";
import { useFields, useCreateField } from "@/lib/queries/fields";
import { parseCsv } from "@/lib/csv-parse";

type FieldMapping = Record<string, { type: "existing" | "new"; fieldKey?: string }>;

export function ImportSubscribersDialog({
  workspaceId,
  onClose,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [emailColumn, setEmailColumn] = useState<string | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<Record<string, boolean>>({});
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const { data: groups } = useGroups(workspaceId);
  const { data: fields } = useFields(workspaceId);
  const createField = useCreateField(workspaceId);
  const importSubscribers = useImportSubscribers(workspaceId);

  const existingFieldMap = useMemo(() => {
    const map: Record<string, { key: string; label: string }> = {};
    fields?.forEach((f) => {
      map[f.key] = { key: f.key, label: f.label };
    });
    return map;
  }, [fields]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      const { headers: h, rows } = parseCsv(text);
      setHeaders(h);
      setPreviewRows(rows.slice(0, 5));
      setEmailColumn(null);
      setSelectedColumns({});
      setFieldMapping({});
      setError(null);
    };
    reader.readAsText(selected);
  }

  function toggleColumn(column: string) {
    setSelectedColumns((prev) => {
      const next = { ...prev };
      if (next[column]) {
        delete next[column];
        setFieldMapping((mapping) => {
          const nextMapping = { ...mapping };
          delete nextMapping[column];
          return nextMapping;
        });
      } else {
        next[column] = true;
      }
      return next;
    });
  }

  function handleFieldMappingChange(column: string, mapping: { type: "existing" | "new"; fieldKey?: string }) {
    setFieldMapping((prev) => {
      const next = { ...prev };
      if (mapping.type === "existing" && mapping.fieldKey) {
        next[column] = { type: "existing", fieldKey: mapping.fieldKey };
      } else if (mapping.type === "new") {
        next[column] = { type: "new", fieldKey: column.toLowerCase().replace(/[^a-z0-9_]/g, "_") };
      } else {
        delete next[column];
      }
      return next;
    });
  }

  async function handleImport() {
    if (!emailColumn) {
      setError("Please select the email column.");
      return;
    }

    const activeColumns = Object.keys(selectedColumns).filter((col) => selectedColumns[col]);
    if (activeColumns.length === 0) {
      setError("Please select at least one custom field column.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const { rows } = parseCsv(csvText);
      const emailIndex = headers.indexOf(emailColumn);
      if (emailIndex === -1) {
        throw new Error("Email column not found.");
      }

      for (const column of activeColumns) {
        const mapping = fieldMapping[column];
        if (!mapping || mapping.type === "new") {
          const fieldKey = mapping?.fieldKey || column.toLowerCase().replace(/[^a-z0-9_]/g, "_");
          const existingField = Object.values(existingFieldMap).find((f) => f.key === fieldKey);
          if (!existingField) {
            await createField.mutateAsync({
              key: fieldKey,
              label: column.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
              type: "TEXT",
            });
          }
        }
      }

      const subscribers = rows
        .map((row) => {
          const email = row[emailIndex]?.trim();
          if (!email) return null;

          const customFields: Record<string, unknown> = {};
          for (const column of activeColumns) {
            const colIndex = headers.indexOf(column);
            if (colIndex === -1) continue;
            const rawValue = row[colIndex]?.trim() ?? "";
            if (rawValue === "") continue;

            const mapping = fieldMapping[column];
            const fieldKey = mapping?.fieldKey || column.toLowerCase().replace(/[^a-z0-9_]/g, "_");
            customFields[fieldKey] = rawValue;
          }

          return {
            email,
            customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
          };
        })
        .filter((s): s is { email: string; customFields?: Record<string, unknown> } => s !== null);

      if (subscribers.length === 0) {
        throw new Error("No valid subscribers found in the CSV.");
      }

      await importSubscribers.mutateAsync({
        subscribers,
        groupIds: selectedGroups.length > 0 ? selectedGroups : undefined,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setPending(false);
    }
  }

  const canImport = headers.length > 0 && emailColumn !== null && Object.values(selectedColumns).some((v) => v);

  return (
    <Modal title="Import subscribers" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="csvFile">CSV file</Label>
          <Input
            id="csvFile"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="mt-1.5"
          />
          <p className="mt-1.5 text-xs text-ink-soft">
            Upload a CSV file with a header row. The first row should contain column names.
          </p>
        </div>

        {headers.length > 0 && (
          <>
            <div>
              <Label htmlFor="emailColumn">Email column</Label>
              <select
                id="emailColumn"
                value={emailColumn ?? ""}
                onChange={(e) => setEmailColumn(e.target.value || null)}
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
              >
                <option value="">Select a column</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Custom fields to import</Label>
              <p className="mt-1 mb-2 text-xs text-ink-soft">
                Select columns to import as custom fields. Map them to existing fields or create new ones.
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto rounded-md border border-line p-2">
                {headers.map((header) => {
                  if (header === emailColumn) return null;
                  const isSelected = selectedColumns[header] || false;
                  const mapping = fieldMapping[header];

                  return (
                    <div key={header} className="space-y-1">
                      <label className="flex items-center gap-2 text-sm text-ink">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleColumn(header)}
                          className="h-4 w-4 rounded border border-line bg-surface accent-teal"
                        />
                        {header}
                      </label>
                      {isSelected && (
                        <div className="ml-6">
                          <select
                            value={mapping ? (mapping.type === "existing" ? `existing:${mapping.fieldKey}` : "new") : "new"}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value.startsWith("existing:")) {
                                handleFieldMappingChange(header, { type: "existing", fieldKey: value.replace("existing:", "") });
                              } else {
                                handleFieldMappingChange(header, { type: "new" });
                              }
                            }}
                            className="w-full rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink"
                          >
                            <option value="new">Create new field: {header}</option>
                            {Object.values(existingFieldMap).length > 0 && (
                              <>
                                <optgroup label="Existing fields">
                                  {Object.values(existingFieldMap).map((f) => (
                                    <option key={f.key} value={`existing:${f.key}`}>
                                      {f.label}
                                    </option>
                                  ))}
                                </optgroup>
                              </>
                            )}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {groups && groups.length > 0 && (
              <div>
                <Label>Groups</Label>
                <p className="mt-1 mb-2 text-xs text-ink-soft">
                  Optionally assign imported subscribers to groups.
                </p>
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => {
                    const checked = selectedGroups.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() =>
                          setSelectedGroups((prev) =>
                            checked ? prev.filter((id) => id !== g.id) : [...prev, g.id]
                          )
                        }
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
              </div>
            )}

            {previewRows.length > 0 && (
              <div>
                <Label>Preview</Label>
                <div className="mt-1.5 overflow-x-auto rounded-md border border-line">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-canvas text-left text-ink-soft">
                        {headers.map((h) => (
                          <th key={h} className="px-3 py-2 font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {previewRows.map((row, i) => (
                        <tr key={i} className="hover:bg-canvas">
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2 text-ink">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  Showing first {previewRows.length} of {parseCsv(csvText).rows.length} rows.
                </p>
              </div>
            )}

            <FieldError>{error || importSubscribers.error?.message}</FieldError>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
                Cancel
              </Button>
              <Button type="button" onClick={handleImport} disabled={!canImport || pending || importSubscribers.isPending}>
                {pending || importSubscribers.isPending ? "Importing…" : "Import subscribers"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

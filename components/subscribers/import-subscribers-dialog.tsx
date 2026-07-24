"use client";

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { useImportSubscribers } from "@/lib/queries/subscribers";
import { useGroups, useFields } from "@/lib/queries/groups";
import { parseCsv } from "@/lib/csv-parse";

type FieldMapping = Record<string, string | null>;

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
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: groups } = useGroups(workspaceId);
  const { data: fields } = useFields(workspaceId);
  const importSubscribers = useImportSubscribers(workspaceId);

  const customFieldKeys = useMemo(() => fields?.map((f) => ({ key: f.key, label: f.label })) ?? [], [fields]);

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
      setFieldMapping({});
      setError(null);
    };
    reader.readAsText(selected);
  }

  function handleFieldMappingChange(fieldKey: string, csvColumn: string | null) {
    setFieldMapping((prev) => {
      const next = { ...prev };
      if (csvColumn === null) {
        delete next[fieldKey];
      } else {
        next[fieldKey] = csvColumn;
      }
      return next;
    });
  }

  async function handleImport() {
    if (!emailColumn) {
      setError("Please select the email column.");
      return;
    }

    const { rows } = parseCsv(csvText);
    const emailIndex = headers.indexOf(emailColumn);
    if (emailIndex === -1) {
      setError("Email column not found.");
      return;
    }

    const subscribers = rows
      .map((row) => {
        const email = row[emailIndex]?.trim();
        if (!email) return null;

        const customFields: Record<string, unknown> = {};
        for (const [fieldKey, csvColumn] of Object.entries(fieldMapping)) {
          if (!csvColumn) continue;
          const colIndex = headers.indexOf(csvColumn);
          if (colIndex === -1) continue;
          const rawValue = row[colIndex]?.trim() ?? "";
          if (rawValue === "") continue;
          customFields[fieldKey] = rawValue;
        }

        return { email, customFields: Object.keys(customFields).length > 0 ? customFields : undefined };
      })
      .filter((s): s is { email: string; customFields?: Record<string, unknown> } => s !== null);

    if (subscribers.length === 0) {
      setError("No valid subscribers found in the CSV.");
      return;
    }

    await importSubscribers.mutateAsync({
      subscribers,
      groupIds: selectedGroups.length > 0 ? selectedGroups : undefined,
    });
    onClose();
  }

  const canImport = headers.length > 0 && emailColumn !== null;

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

            {customFieldKeys.length > 0 && (
              <div>
                <Label>Map custom fields</Label>
                <p className="mt-1 mb-2 text-xs text-ink-soft">
                  Match CSV columns to your custom fields.
                </p>
                <div className="space-y-2">
                  {customFieldKeys.map((field) => (
                    <div key={field.key} className="flex items-center gap-2">
                      <span className="w-1/3 text-sm text-ink">{field.label}</span>
                      <select
                        value={fieldMapping[field.key] ?? ""}
                        onChange={(e) => handleFieldMappingChange(field.key, e.target.value || null)}
                        className="flex-1 rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink"
                      >
                        <option value="">—</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={handleImport} disabled={!canImport || importSubscribers.isPending}>
                {importSubscribers.isPending ? "Importing…" : "Import subscribers"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

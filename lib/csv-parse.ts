export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current);
        current = "";
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && next === '\n') i++;
        row.push(current);
        current = "";
        if (row.length > 0 && row.some((cell) => cell !== "")) {
          rows.push(row);
        }
        row = [];
      } else {
        current += char;
      }
    }
  }

  row.push(current);
  if (row.length > 0 && row.some((cell) => cell !== "")) {
    rows.push(row);
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return { headers, rows: dataRows };
}

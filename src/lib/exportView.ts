// Client-side CSV export — no backend endpoint needed. PDF export reuses
// the browser's native print-to-PDF (window.print()) rather than pulling
// in a client-side PDF library for a Day F2 nice-to-have.
export function exportRowsAsCsv(filename: string, rows: Array<Record<string, string | number>>): void {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const escapeCell = (value: string | number) => {
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replaceAll('"', '""')}"` : str;
  };
  const lines = [headers.join(","), ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

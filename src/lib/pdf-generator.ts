/**
 * Generates a print-friendly HTML report that can be saved/printed as PDF from the browser.
 * Returns an HTML string with embedded styles optimized for print layout.
 */
export function generateReportHtml(options: {
  title: string;
  subtitle?: string;
  columns: Array<{ key: string; label: string }>;
  rows: Record<string, unknown>[];
  generatedAt?: Date;
}): string {
  const { title, subtitle, columns, rows, generatedAt = new Date() } = options;

  const headerCells = columns
    .map((col) => `<th>${escapeHtml(col.label)}</th>`)
    .join("\n          ");

  const bodyRows = rows
    .map(
      (row) =>
        `        <tr>\n${columns
          .map(
            (col) =>
              `          <td>${escapeHtml(String(row[col.key] ?? ""))}</td>`,
          )
          .join("\n")}\n        </tr>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none !important; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
    }

    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      padding: 20px;
      max-width: 1100px;
      margin: 0 auto;
    }

    .report-header {
      border-bottom: 2px solid #1a365d;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }

    .report-header h1 {
      font-size: 20px;
      color: #1a365d;
      margin: 0 0 4px 0;
    }

    .report-header .subtitle {
      font-size: 13px;
      color: #4a5568;
      margin: 0;
    }

    .report-meta {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #718096;
      margin-bottom: 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }

    thead th {
      background-color: #1a365d;
      color: #fff;
      padding: 6px 8px;
      text-align: left;
      font-weight: 600;
      white-space: nowrap;
    }

    tbody td {
      padding: 5px 8px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }

    tbody tr:nth-child(even) {
      background-color: #f7fafc;
    }

    tbody tr:hover {
      background-color: #edf2f7;
    }

    .print-btn {
      position: fixed;
      top: 16px;
      right: 16px;
      padding: 8px 16px;
      background: #1a365d;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }

    .print-btn:hover { background: #2a4365; }

    .report-footer {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #a0aec0;
      text-align: center;
    }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>

  <div class="report-header">
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}
  </div>

  <div class="report-meta">
    <span>Total Records: ${rows.length}</span>
    <span>Generated: ${generatedAt.toISOString().replace("T", " ").slice(0, 19)} UTC</span>
  </div>

  <table>
    <thead>
      <tr>
        ${headerCells}
      </tr>
    </thead>
    <tbody>
${bodyRows}
    </tbody>
  </table>

  <div class="report-footer">
    OIG Investigation Tracking System &mdash; ${escapeHtml(title)} &mdash; Page 1
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

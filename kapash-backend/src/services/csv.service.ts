import { Response } from 'express';

function escape(v: any): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Streams a CSV response. headers is the column list; rows is an array of plain objects (keys = headers).
 * For very large datasets, prefer the chunked async generator variant below.
 */
export function streamCsv(res: Response, filename: string, headers: string[], rows: Record<string, any>[]) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.write(headers.map(escape).join(',') + '\n');
  for (const row of rows) {
    res.write(headers.map(h => escape(row[h])).join(',') + '\n');
  }
  res.end();
}

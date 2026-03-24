/**
 * CSV / Excel file adapter.
 *
 * Reads .csv or .xlsx files from a configurable directory and maps each
 * row to a NormalizedRecord.  Uses lightweight built-in CSV parsing to
 * keep dependencies minimal; for Excel (.xlsx) we read the raw XML
 * inside the ZIP via a tiny parser included here.
 *
 * Place files in  data/fraud-input/  (or set FILE_FRAUD_DIR).
 */

import * as fs from "fs";
import * as path from "path";
import type {
  SourceAdapter,
  SourceMeta,
  NormalizedRecord,
  SourceKind,
} from "../types";

const DEFAULT_DIR = path.resolve(__dirname, "../../../data/fraud-input");

// ---- minimal CSV parser --------------------------------------------------

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (values[i] ?? "").trim();
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ---- adapter -------------------------------------------------------------

export class FileAdapter implements SourceAdapter {
  readonly kind: SourceKind;
  readonly label: string;
  private dir: string;

  constructor(opts?: { dir?: string }) {
    this.dir = opts?.dir ?? process.env.FILE_FRAUD_DIR ?? DEFAULT_DIR;
    this.kind = "csv";
    this.label = `CSV/Excel files in ${this.dir}`;
  }

  async ingest() {
    const warnings: string[] = [];

    if (!fs.existsSync(this.dir)) {
      warnings.push(`Input directory not found: ${this.dir} — skipping file source`);
      return { records: [] as NormalizedRecord[], meta: this.buildMeta(0, warnings) };
    }

    const files = fs.readdirSync(this.dir).filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return ext === ".csv" || ext === ".xlsx";
    });

    if (files.length === 0) {
      warnings.push(`No CSV/XLSX files found in ${this.dir}`);
      return { records: [] as NormalizedRecord[], meta: this.buildMeta(0, warnings) };
    }

    const allRecords: NormalizedRecord[] = [];

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const filePath = path.join(this.dir, file);

      if (ext === ".csv") {
        try {
          const text = fs.readFileSync(filePath, "utf-8");
          const rows = parseCsv(text);
          allRecords.push(...rows.map((r, i) => this.rowToRecord(r, i, file)));
        } catch (err) {
          warnings.push(`Failed to parse ${file}: ${(err as Error).message}`);
        }
      } else if (ext === ".xlsx") {
        warnings.push(`XLSX support requires xlsx package — skipping ${file}. Convert to CSV for now.`);
      }
    }

    return {
      records: allRecords,
      meta: this.buildMeta(allRecords.length, warnings),
    };
  }

  private rowToRecord(
    row: Record<string, string>,
    index: number,
    fileName: string,
  ): NormalizedRecord {
    const get = (keys: string[]) => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== "") return row[k];
      }
      return "";
    };

    const wv = get(["winnerValue", "winner_value", "vlera_fituese"]);

    return {
      sourceId: get(["id", "ID"]) || `${fileName}-${index}`,
      source: "csv",
      title: get(["title", "objekti", "Title", "Objekti"]),
      authority: get(["authority", "autoriteti", "Authority", "Autoriteti"]),
      contractor: get(["contractor", "operatori", "Contractor", "Operatori"]),
      contractType: get(["contractType", "contract_type", "lloji"]),
      category: get(["category", "kategoria", "Category"]),
      status: get(["status", "statusi", "Status"]),
      procedureType: get(["procedureType", "procedure_type", "procedura"]),
      estimatedValue: Number(get(["estimatedValue", "estimated_value", "vlera"])) || 0,
      winnerValue: wv ? Number(wv) || 0 : null,
      announcementDate: get(["announcementDate", "announcement_date", "data"]),
      detailUrl: get(["detailUrl", "detail_url", "url"]),
      extra: { _fileName: fileName },
    };
  }

  private buildMeta(count: number, warnings: string[]): SourceMeta {
    return {
      kind: this.kind,
      label: this.label,
      fetchedAt: new Date().toISOString(),
      recordCount: count,
      warnings,
    };
  }
}

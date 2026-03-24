/**
 * Adapter that reads the existing public/data/tenders.json produced by
 * the scrape-tenders.ts script and maps each entry to NormalizedRecord.
 */

import * as fs from "fs";
import * as path from "path";
import type {
  SourceAdapter,
  SourceMeta,
  NormalizedRecord,
  SourceKind,
} from "../types";

const DEFAULT_PATH = path.resolve(
  __dirname,
  "../../../public/data/tenders.json",
);

export class TendersJsonAdapter implements SourceAdapter {
  readonly kind: SourceKind = "tenders-json";
  readonly label = "OpenProcurement tenders.json";
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath ?? DEFAULT_PATH;
  }

  async ingest() {
    const warnings: string[] = [];

    if (!fs.existsSync(this.filePath)) {
      warnings.push(`File not found: ${this.filePath}`);
      return {
        records: [] as NormalizedRecord[],
        meta: this.buildMeta(0, warnings),
      };
    }

    const raw = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
    const tenders: unknown[] = Array.isArray(raw?.tenders)
      ? raw.tenders
      : [];

    const records: NormalizedRecord[] = [];
    for (const t of tenders) {
      const obj = t as Record<string, unknown>;
      records.push({
        sourceId: String(obj.id ?? `row-${records.length}`),
        source: this.kind,
        title: String(obj.title ?? ""),
        authority: String(obj.authority ?? ""),
        contractor: String(obj.contractor ?? ""),
        contractType: String(obj.contractType ?? ""),
        category: String(obj.category ?? ""),
        status: String(obj.status ?? ""),
        procedureType: String(obj.procedureType ?? ""),
        estimatedValue: Number(obj.estimatedValue) || 0,
        winnerValue:
          obj.winnerValue != null ? Number(obj.winnerValue) || 0 : null,
        announcementDate: String(obj.announcementDate ?? ""),
        detailUrl: String(obj.detailUrl ?? ""),
        extra: {},
      });
    }

    if (records.length === 0) {
      warnings.push("tenders.json contained zero records");
    }

    return { records, meta: this.buildMeta(records.length, warnings) };
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

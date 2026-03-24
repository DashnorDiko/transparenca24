/**
 * Normalize and validate NormalizedRecords coming out of source adapters.
 *
 * Standardizes dates, amounts, and string fields, then emits validation
 * warnings for records that are missing critical fields (to avoid false
 * positives in the rule engine).
 */

import type { NormalizedRecord, ValidationWarning } from "../types";

function trimOrFallback(value: string, fallback = "N/A"): string {
  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeDate(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toISOString().split("T")[0];
}

export function normalizeRecords(
  records: NormalizedRecord[],
): { records: NormalizedRecord[]; warnings: ValidationWarning[] } {
  const warnings: ValidationWarning[] = [];

  const normalized = records.map((r) => {
    const nr: NormalizedRecord = {
      ...r,
      title: trimOrFallback(r.title, "Untitled"),
      authority: trimOrFallback(r.authority),
      contractor: trimOrFallback(r.contractor, ""),
      contractType: trimOrFallback(r.contractType),
      category: trimOrFallback(r.category),
      status: trimOrFallback(r.status),
      procedureType: trimOrFallback(r.procedureType),
      estimatedValue: Number.isFinite(r.estimatedValue) ? r.estimatedValue : 0,
      winnerValue:
        r.winnerValue != null && Number.isFinite(r.winnerValue)
          ? r.winnerValue
          : null,
      announcementDate: normalizeDate(r.announcementDate),
    };

    if (!nr.title || nr.title === "Untitled") {
      warnings.push({ sourceId: nr.sourceId, field: "title", message: "Missing title" });
    }
    if (!nr.authority || nr.authority === "N/A") {
      warnings.push({ sourceId: nr.sourceId, field: "authority", message: "Missing authority" });
    }
    if (nr.estimatedValue <= 0) {
      warnings.push({ sourceId: nr.sourceId, field: "estimatedValue", message: "Missing or zero estimated value" });
    }

    return nr;
  });

  return { records: normalized, warnings };
}

/**
 * Deterministic entity matching — groups records that share the same
 * authority + title (exact) so the rule engine can reason about clusters.
 */
export function groupByEntity(
  records: NormalizedRecord[],
): Map<string, NormalizedRecord[]> {
  const map = new Map<string, NormalizedRecord[]>();
  for (const r of records) {
    const key = `${r.authority.toLowerCase()}::${r.title.toLowerCase()}`;
    const existing = map.get(key) ?? [];
    existing.push(r);
    map.set(key, existing);
  }
  return map;
}

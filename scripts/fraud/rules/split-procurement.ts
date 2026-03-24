/**
 * Rule: Split Procurement
 *
 * Detects potential bid splitting — when an authority publishes multiple
 * tenders with similar titles and individually low values that together
 * exceed the open-procedure threshold.
 */

import type { FraudRule, NormalizedRecord, RuleHit } from "../types";

const SIMILARITY_THRESHOLD = 0.75;
const OPEN_PROCEDURE_LIMIT = 8_000_000; // 8 million Lek — common threshold

function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0 || bLen === 0) return 0;

  const matchWindow = Math.max(Math.floor(Math.max(aLen, bLen) / 2) - 1, 0);
  const aMatches = new Array(aLen).fill(false);
  const bMatches = new Array(bLen).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < aLen; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, bLen);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < aLen; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / aLen + matches / bLen + (matches - transpositions / 2) / matches) / 3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(aLen, bLen)); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

export const splitProcurementRule: FraudRule = {
  id: "SPLIT_PROCUREMENT",
  name: "Suspected split procurement",
  severity: "high",

  evaluate(records: NormalizedRecord[]): RuleHit[] {
    const hits: RuleHit[] = [];
    const seen = new Set<string>();

    const byAuthority = new Map<string, NormalizedRecord[]>();
    for (const r of records) {
      if (r.estimatedValue <= 0 || r.estimatedValue >= OPEN_PROCEDURE_LIMIT)
        continue;
      const key = r.authority.toLowerCase();
      const list = byAuthority.get(key) ?? [];
      list.push(r);
      byAuthority.set(key, list);
    }

    for (const [, group] of byAuthority) {
      for (let i = 0; i < group.length; i++) {
        const cluster: NormalizedRecord[] = [group[i]];
        for (let j = i + 1; j < group.length; j++) {
          const sim = jaroWinkler(
            group[i].title.toLowerCase(),
            group[j].title.toLowerCase(),
          );
          if (sim >= SIMILARITY_THRESHOLD) {
            cluster.push(group[j]);
          }
        }

        if (cluster.length < 2) continue;

        const clusterKey = cluster
          .map((r) => r.sourceId)
          .sort()
          .join(",");
        if (seen.has(clusterKey)) continue;
        seen.add(clusterKey);

        const combined = cluster.reduce(
          (s, r) => s + r.estimatedValue,
          0,
        );
        if (combined >= OPEN_PROCEDURE_LIMIT) {
          hits.push({
            ruleId: this.id,
            ruleName: this.name,
            severity: this.severity,
            description: `${cluster.length} similar tenders by "${cluster[0].authority}" total ${combined.toLocaleString()} Lek — above open-procedure threshold`,
            involvedRecords: cluster.map((r) => r.sourceId),
            evidence: {
              clusterSize: cluster.length,
              combinedValue: combined,
              threshold: OPEN_PROCEDURE_LIMIT,
              titles: cluster.map((r) => r.title),
            },
          });
        }
      }
    }

    return hits;
  },
};

/**
 * Rule: Repeated Supplier
 *
 * Flags authorities that award more than a threshold percentage of
 * their tenders to the same contractor — potential favoritism.
 */

import type { FraudRule, NormalizedRecord, RuleHit } from "../types";

const THRESHOLD_PCT = 60;
const MIN_AWARDS = 3;

export const repeatedSupplierRule: FraudRule = {
  id: "REPEATED_SUPPLIER",
  name: "Repeated same supplier dominance",
  severity: "high",

  evaluate(records: NormalizedRecord[]): RuleHit[] {
    const byAuthority = new Map<string, NormalizedRecord[]>();
    for (const r of records) {
      if (!r.contractor || r.contractor === "N/A") continue;
      const key = r.authority.toLowerCase();
      const list = byAuthority.get(key) ?? [];
      list.push(r);
      byAuthority.set(key, list);
    }

    const hits: RuleHit[] = [];

    for (const [authKey, group] of byAuthority) {
      const supplierCounts = new Map<string, NormalizedRecord[]>();
      for (const r of group) {
        const sk = r.contractor.toLowerCase();
        const list = supplierCounts.get(sk) ?? [];
        list.push(r);
        supplierCounts.set(sk, list);
      }

      for (const [supplier, recs] of supplierCounts) {
        const pct = (recs.length / group.length) * 100;
        if (recs.length >= MIN_AWARDS && pct >= THRESHOLD_PCT) {
          hits.push({
            ruleId: this.id,
            ruleName: this.name,
            severity: this.severity,
            description: `Contractor "${recs[0].contractor}" wins ${recs.length}/${group.length} (${pct.toFixed(0)}%) of tenders for "${recs[0].authority}"`,
            involvedRecords: recs.map((r) => r.sourceId),
            evidence: {
              authority: authKey,
              supplier,
              winCount: recs.length,
              totalForAuthority: group.length,
              percentage: pct,
            },
          });
        }
      }
    }

    return hits;
  },
};

/**
 * Rule: Cancellation Anomaly
 *
 * Flags authorities with an abnormally high rate of cancelled tenders.
 * A high cancellation rate can indicate collusion or procedure manipulation.
 */

import type { FraudRule, NormalizedRecord, RuleHit } from "../types";

const CANCEL_RATE_THRESHOLD = 0.40;
const MIN_TENDERS = 5;

const CANCEL_KEYWORDS = [
  "anuluar",
  "cancelled",
  "canceled",
  "anulohet",
  "ndërprerë",
];

function isCancelled(status: string): boolean {
  const lower = status.toLowerCase();
  return CANCEL_KEYWORDS.some((kw) => lower.includes(kw));
}

export const cancellationAnomalyRule: FraudRule = {
  id: "CANCELLATION_ANOMALY",
  name: "Abnormal cancellation rate",
  severity: "medium",

  evaluate(records: NormalizedRecord[]): RuleHit[] {
    const byAuthority = new Map<
      string,
      { all: NormalizedRecord[]; cancelled: NormalizedRecord[] }
    >();

    for (const r of records) {
      const key = r.authority.toLowerCase();
      const entry = byAuthority.get(key) ?? { all: [], cancelled: [] };
      entry.all.push(r);
      if (isCancelled(r.status)) entry.cancelled.push(r);
      byAuthority.set(key, entry);
    }

    const hits: RuleHit[] = [];

    for (const [, { all, cancelled }] of byAuthority) {
      if (all.length < MIN_TENDERS) continue;
      const rate = cancelled.length / all.length;
      if (rate >= CANCEL_RATE_THRESHOLD) {
        hits.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: this.severity,
          description: `"${all[0].authority}" cancelled ${cancelled.length}/${all.length} tenders (${(rate * 100).toFixed(0)}%)`,
          involvedRecords: cancelled.map((r) => r.sourceId),
          evidence: {
            authority: all[0].authority,
            totalTenders: all.length,
            cancelledCount: cancelled.length,
            rate,
          },
        });
      }
    }

    return hits;
  },
};

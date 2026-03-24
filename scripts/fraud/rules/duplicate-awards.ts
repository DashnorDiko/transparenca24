/**
 * Rule: Duplicate Awards
 *
 * Flags tenders that share the same title + authority but appear as
 * separate records — a sign of double booking or duplicate contract
 * awards.
 */

import type { FraudRule, NormalizedRecord, RuleHit } from "../types";
import { groupByEntity } from "../normalize/normalize";

export const duplicateAwardsRule: FraudRule = {
  id: "DUPLICATE_AWARDS",
  name: "Duplicate awards for same tender",
  severity: "high",

  evaluate(records: NormalizedRecord[]): RuleHit[] {
    const groups = groupByEntity(records);
    const hits: RuleHit[] = [];

    for (const [key, group] of groups) {
      if (group.length < 2) continue;

      const awarded = group.filter(
        (r) => r.winnerValue != null && r.winnerValue > 0,
      );
      if (awarded.length >= 2) {
        hits.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: this.severity,
          description: `${awarded.length} awarded records found for "${group[0].title}" by ${group[0].authority}`,
          involvedRecords: awarded.map((r) => r.sourceId),
          evidence: {
            entityKey: key,
            awardCount: awarded.length,
            totalValue: awarded.reduce((s, r) => s + (r.winnerValue ?? 0), 0),
          },
        });
      }
    }

    return hits;
  },
};

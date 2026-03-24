/**
 * Rule: Suspicious Value Jump
 *
 * Flags tenders where winnerValue is abnormally close to (or exceeds)
 * the estimatedValue, or where estimatedValue itself is an outlier
 * within its category.
 */

import type { FraudRule, NormalizedRecord, RuleHit } from "../types";

const WINNER_RATIO_HIGH = 0.98;
const WINNER_RATIO_OVER = 1.0;
const CATEGORY_STDDEV_FACTOR = 3;

function mean(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stddev(nums: number[]): number {
  const m = mean(nums);
  return Math.sqrt(nums.reduce((s, v) => s + (v - m) ** 2, 0) / nums.length);
}

export const valueAnomalyRule: FraudRule = {
  id: "VALUE_ANOMALY",
  name: "Suspicious value patterns",
  severity: "medium",

  evaluate(records: NormalizedRecord[]): RuleHit[] {
    const hits: RuleHit[] = [];

    // 1) Winner value >= 98% of estimated — possible bid rigging
    for (const r of records) {
      if (r.winnerValue == null || r.estimatedValue <= 0) continue;
      const ratio = r.winnerValue / r.estimatedValue;

      if (ratio > WINNER_RATIO_OVER) {
        hits.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: "critical",
          description: `Winner value (${r.winnerValue}) exceeds estimated value (${r.estimatedValue}) by ${((ratio - 1) * 100).toFixed(1)}%`,
          involvedRecords: [r.sourceId],
          evidence: { ratio, estimatedValue: r.estimatedValue, winnerValue: r.winnerValue },
        });
      } else if (ratio >= WINNER_RATIO_HIGH) {
        hits.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: "medium",
          description: `Winner value is ${(ratio * 100).toFixed(1)}% of estimated — unusually close`,
          involvedRecords: [r.sourceId],
          evidence: { ratio, estimatedValue: r.estimatedValue, winnerValue: r.winnerValue },
        });
      }
    }

    // 2) Category outliers — estimated value far from category mean
    const byCategory = new Map<string, NormalizedRecord[]>();
    for (const r of records) {
      if (r.estimatedValue <= 0) continue;
      const list = byCategory.get(r.category) ?? [];
      list.push(r);
      byCategory.set(r.category, list);
    }

    for (const [cat, group] of byCategory) {
      if (group.length < 5) continue;
      const values = group.map((r) => r.estimatedValue);
      const m = mean(values);
      const sd = stddev(values);
      if (sd === 0) continue;

      for (const r of group) {
        const zScore = (r.estimatedValue - m) / sd;
        if (zScore > CATEGORY_STDDEV_FACTOR) {
          hits.push({
            ruleId: this.id,
            ruleName: this.name,
            severity: "medium",
            description: `Estimated value ${r.estimatedValue} is ${zScore.toFixed(1)} std devs above category "${cat}" mean (${m.toFixed(0)})`,
            involvedRecords: [r.sourceId],
            evidence: { category: cat, zScore, mean: m, stddev: sd },
          });
        }
      }
    }

    return hits;
  },
};

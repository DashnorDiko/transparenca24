/**
 * Rule registry — collects all fraud rules and provides a single
 * entry point for the scoring pipeline.
 */

import type { FraudRule, NormalizedRecord, RuleHit } from "../types";
import { duplicateAwardsRule } from "./duplicate-awards";
import { repeatedSupplierRule } from "./repeated-supplier";
import { valueAnomalyRule } from "./value-anomaly";
import { splitProcurementRule } from "./split-procurement";
import { cancellationAnomalyRule } from "./cancellation-anomaly";

export const ALL_RULES: FraudRule[] = [
  duplicateAwardsRule,
  repeatedSupplierRule,
  valueAnomalyRule,
  splitProcurementRule,
  cancellationAnomalyRule,
];

export function runAllRules(records: NormalizedRecord[]): RuleHit[] {
  const hits: RuleHit[] = [];
  for (const rule of ALL_RULES) {
    try {
      hits.push(...rule.evaluate(records));
    } catch (err) {
      console.error(`Rule "${rule.id}" threw:`, (err as Error).message);
    }
  }
  return hits;
}

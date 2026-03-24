/**
 * Risk scoring engine.
 *
 * Assigns each record a composite score based on the weighted severity
 * of rule hits that reference it.  Produces a ScoredRecord[] with
 * risk_score, risk_level, and the list of triggered_rules for
 * explainability.
 */

import type {
  NormalizedRecord,
  RuleHit,
  RiskLevel,
  ScoredRecord,
  RuleSeverity,
} from "../types";

const SEVERITY_WEIGHTS: Record<RuleSeverity, number> = {
  critical: 40,
  high: 25,
  medium: 15,
  low: 5,
  info: 1,
};

function resolveLevel(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  if (score > 0) return "low";
  return "none";
}

export function scoreRecords(
  records: NormalizedRecord[],
  hits: RuleHit[],
): ScoredRecord[] {
  const hitsByRecord = new Map<string, RuleHit[]>();
  for (const hit of hits) {
    for (const id of hit.involvedRecords) {
      const list = hitsByRecord.get(id) ?? [];
      list.push(hit);
      hitsByRecord.set(id, list);
    }
  }

  return records.map((record) => {
    const recordHits = hitsByRecord.get(record.sourceId) ?? [];

    const rawScore = recordHits.reduce(
      (sum, h) => sum + SEVERITY_WEIGHTS[h.severity],
      0,
    );
    const riskScore = Math.min(100, rawScore);

    return {
      record,
      riskScore,
      riskLevel: resolveLevel(riskScore),
      triggeredRules: recordHits,
    };
  });
}

export function distributionSummary(
  scored: ScoredRecord[],
): Record<RiskLevel, number> {
  const dist: Record<RiskLevel, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    none: 0,
  };
  for (const s of scored) {
    dist[s.riskLevel]++;
  }
  return dist;
}

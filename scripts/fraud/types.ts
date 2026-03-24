/**
 * Canonical types for the KLSH fraud-detection pipeline.
 *
 * Every source adapter normalizes its data into NormalizedRecord before
 * it enters the rule engine and scoring pipeline.
 */

// ---------------------------------------------------------------------------
// Source adapters
// ---------------------------------------------------------------------------

export type SourceKind = "tenders-json" | "api" | "csv" | "excel";

export interface SourceMeta {
  kind: SourceKind;
  label: string;
  fetchedAt: string;
  recordCount: number;
  warnings: string[];
}

export interface SourceAdapter {
  readonly kind: SourceKind;
  readonly label: string;
  ingest(): Promise<{ records: NormalizedRecord[]; meta: SourceMeta }>;
}

// ---------------------------------------------------------------------------
// Normalized record — the single shape that rules and scoring operate on
// ---------------------------------------------------------------------------

export interface NormalizedRecord {
  /** Stable identifier scoped to the source (tender id, row hash, etc.) */
  sourceId: string;
  source: SourceKind;

  title: string;
  authority: string;
  contractor: string;
  contractType: string;
  category: string;
  status: string;
  procedureType: string;

  estimatedValue: number;
  winnerValue: number | null;
  announcementDate: string;
  detailUrl: string;

  /** Arbitrary key-value bag for source-specific fields */
  extra: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationWarning {
  sourceId: string;
  field: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Rule engine
// ---------------------------------------------------------------------------

export type RuleSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface RuleHit {
  ruleId: string;
  ruleName: string;
  severity: RuleSeverity;
  description: string;
  /** IDs of records involved */
  involvedRecords: string[];
  /** Supporting evidence for human review */
  evidence: Record<string, unknown>;
}

export interface FraudRule {
  readonly id: string;
  readonly name: string;
  readonly severity: RuleSeverity;
  evaluate(records: NormalizedRecord[]): RuleHit[];
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export type RiskLevel = "critical" | "high" | "medium" | "low" | "none";

export interface ScoredRecord {
  record: NormalizedRecord;
  riskScore: number;
  riskLevel: RiskLevel;
  triggeredRules: RuleHit[];
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export interface FraudReport {
  generatedAt: string;
  sources: SourceMeta[];
  totalRecords: number;
  totalFindings: number;
  scoreDistribution: Record<RiskLevel, number>;
  findings: ScoredRecord[];
  validationWarnings: ValidationWarning[];
}

// ---------------------------------------------------------------------------
// Email delivery
// ---------------------------------------------------------------------------

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string[];
}

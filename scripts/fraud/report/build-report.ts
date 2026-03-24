/**
 * Report builder — assembles the FraudReport and writes JSON, CSV, and
 * a human-readable Markdown/HTML summary.
 */

import * as fs from "fs";
import * as path from "path";
import type {
  FraudReport,
  ScoredRecord,
  SourceMeta,
  ValidationWarning,
} from "../types";
import { distributionSummary } from "../scoring/score";

const OUTPUT_DIR = path.resolve(__dirname, "../../../out/fraud-reports");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ---- JSON ----------------------------------------------------------------

function writeJson(report: FraudReport, dir: string): string {
  const filePath = path.join(dir, "fraud-report.json");
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf-8");
  return filePath;
}

// ---- CSV -----------------------------------------------------------------

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function writeCsv(findings: ScoredRecord[], dir: string): string {
  const headers = [
    "sourceId",
    "riskScore",
    "riskLevel",
    "title",
    "authority",
    "contractor",
    "estimatedValue",
    "winnerValue",
    "status",
    "category",
    "triggeredRules",
    "source",
  ];

  const rows = findings.map((f) =>
    [
      f.record.sourceId,
      String(f.riskScore),
      f.riskLevel,
      escapeCsv(f.record.title),
      escapeCsv(f.record.authority),
      escapeCsv(f.record.contractor),
      String(f.record.estimatedValue),
      f.record.winnerValue != null ? String(f.record.winnerValue) : "",
      f.record.status,
      f.record.category,
      escapeCsv(f.triggeredRules.map((r) => r.ruleId).join("; ")),
      f.record.source,
    ].join(","),
  );

  const filePath = path.join(dir, "fraud-report.csv");
  fs.writeFileSync(filePath, [headers.join(","), ...rows].join("\n"), "utf-8");
  return filePath;
}

// ---- Markdown summary ----------------------------------------------------

function writeSummary(report: FraudReport, dir: string): string {
  const dist = report.scoreDistribution;
  const topFindings = report.findings
    .filter((f) => f.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 20);

  const lines: string[] = [
    "# KLSH Fraud Report",
    "",
    `**Generated:** ${report.generatedAt}`,
    "",
    "## Source Coverage",
    "",
    "| Source | Records | Warnings |",
    "|--------|---------|----------|",
    ...report.sources.map(
      (s) => `| ${s.label} | ${s.recordCount} | ${s.warnings.length} |`,
    ),
    "",
    `**Total records analysed:** ${report.totalRecords}`,
    "",
    "## Risk Distribution",
    "",
    "| Level | Count |",
    "|-------|-------|",
    ...Object.entries(dist).map(([k, v]) => `| ${k} | ${v} |`),
    "",
    `**Total findings (score > 0):** ${report.totalFindings}`,
    "",
    "## Top Findings",
    "",
  ];

  for (const f of topFindings) {
    lines.push(
      `### ${f.record.title}`,
      "",
      `- **Score:** ${f.riskScore} (${f.riskLevel})`,
      `- **Authority:** ${f.record.authority}`,
      `- **Contractor:** ${f.record.contractor || "—"}`,
      `- **Estimated Value:** ${f.record.estimatedValue.toLocaleString()} Lek`,
      `- **Rules triggered:** ${f.triggeredRules.map((r) => `${r.ruleId} (${r.severity})`).join(", ")}`,
      "",
    );

    for (const hit of f.triggeredRules) {
      lines.push(`  > ${hit.description}`);
    }
    lines.push("");
  }

  if (report.validationWarnings.length > 0) {
    lines.push(
      "## Validation Warnings",
      "",
      `${report.validationWarnings.length} records had data quality issues. First 10:`,
      "",
      ...report.validationWarnings.slice(0, 10).map(
        (w) => `- **${w.sourceId}** — ${w.field}: ${w.message}`,
      ),
      "",
    );
  }

  const filePath = path.join(dir, "fraud-report.md");
  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
  return filePath;
}

// ---- Public API ----------------------------------------------------------

export function buildReport(
  scored: ScoredRecord[],
  sources: SourceMeta[],
  warnings: ValidationWarning[],
): FraudReport {
  const findings = scored
    .filter((s) => s.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore);

  return {
    generatedAt: new Date().toISOString(),
    sources,
    totalRecords: scored.length,
    totalFindings: findings.length,
    scoreDistribution: distributionSummary(scored),
    findings,
    validationWarnings: warnings,
  };
}

export function writeReportArtifacts(
  report: FraudReport,
  outDir?: string,
): { jsonPath: string; csvPath: string; mdPath: string } {
  const dir = outDir ?? OUTPUT_DIR;
  ensureDir(dir);

  return {
    jsonPath: writeJson(report, dir),
    csvPath: writeCsv(report.findings, dir),
    mdPath: writeSummary(report, dir),
  };
}

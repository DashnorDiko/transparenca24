/**
 * KLSH Fraud Report — main entry point.
 *
 * Orchestrates: ingest -> normalize -> rules -> score -> report -> email.
 *
 * Run locally:   npx tsx scripts/fraud/run-klsh-report.ts
 * Run via CI:    triggered by .github/workflows/fraud-report-klsh.yml
 *
 * Options (env vars):
 *   SKIP_EMAIL=1     — generate report without sending email
 *   REPORT_DIR=path  — custom output directory for report artifacts
 */

import { TendersJsonAdapter } from "./ingest/tenders-json";
import { ApiAdapter } from "./ingest/api-adapter";
import { FileAdapter } from "./ingest/file-adapter";
import { normalizeRecords } from "./normalize/normalize";
import { runAllRules } from "./rules/index";
import { scoreRecords } from "./scoring/score";
import { buildReport, writeReportArtifacts } from "./report/build-report";
import { loadEmailConfig, sendReport } from "./deliver/email";
import type { SourceAdapter, NormalizedRecord, SourceMeta, ValidationWarning } from "./types";

async function main() {
  console.log("=== KLSH Fraud Detection Pipeline ===\n");

  // 1) Ingest from all configured sources
  const adapters: SourceAdapter[] = [
    new TendersJsonAdapter(),
    new ApiAdapter(),
    new FileAdapter(),
  ];

  const allRecords: NormalizedRecord[] = [];
  const allMeta: SourceMeta[] = [];

  for (const adapter of adapters) {
    console.log(`[ingest] ${adapter.label} ...`);
    try {
      const { records, meta } = await adapter.ingest();
      allRecords.push(...records);
      allMeta.push(meta);
      console.log(`  -> ${meta.recordCount} records`);
      if (meta.warnings.length > 0) {
        for (const w of meta.warnings) console.log(`  ⚠ ${w}`);
      }
    } catch (err) {
      console.error(`  ✘ ${adapter.label} failed:`, (err as Error).message);
      allMeta.push({
        kind: adapter.kind,
        label: adapter.label,
        fetchedAt: new Date().toISOString(),
        recordCount: 0,
        warnings: [(err as Error).message],
      });
    }
  }

  if (allRecords.length === 0) {
    console.error("\nNo records ingested from any source. Aborting.");
    process.exit(1);
  }

  console.log(`\n[normalize] ${allRecords.length} raw records ...`);
  const { records: normalized, warnings } = normalizeRecords(allRecords);
  console.log(`  -> ${normalized.length} normalized, ${warnings.length} warnings`);

  // 2) Run fraud rules
  console.log("\n[rules] Evaluating fraud rules ...");
  const hits = runAllRules(normalized);
  console.log(`  -> ${hits.length} rule hits`);

  // 3) Score
  console.log("\n[scoring] Computing risk scores ...");
  const scored = scoreRecords(normalized, hits);
  const withFindings = scored.filter((s) => s.riskScore > 0);
  console.log(`  -> ${withFindings.length} records with findings`);

  // 4) Build and write report
  console.log("\n[report] Building report artifacts ...");
  const report = buildReport(scored, allMeta, warnings);
  const outDir = process.env.REPORT_DIR ?? undefined;
  const paths = writeReportArtifacts(report, outDir);
  console.log(`  JSON: ${paths.jsonPath}`);
  console.log(`  CSV:  ${paths.csvPath}`);
  console.log(`  MD:   ${paths.mdPath}`);

  // 5) Send email (unless skipped)
  if (process.env.SKIP_EMAIL === "1") {
    console.log("\n[email] SKIP_EMAIL=1 — skipping email delivery");
  } else {
    console.log("\n[email] Sending report to KLSH ...");
    try {
      const emailConfig = loadEmailConfig();
      const artifactDir = outDir ?? paths.jsonPath.replace(/[/\\][^/\\]+$/, "");
      await sendReport(emailConfig, report, artifactDir);
      console.log("  -> Email sent successfully");
    } catch (err) {
      console.error("  ✘ Email delivery failed:", (err as Error).message);
      process.exit(2);
    }
  }

  console.log("\n=== Pipeline complete ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

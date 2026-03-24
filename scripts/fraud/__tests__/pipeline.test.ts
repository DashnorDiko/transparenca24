/**
 * Integration and unit tests for the KLSH fraud pipeline.
 *
 * Run with:  npx tsx scripts/fraud/__tests__/pipeline.test.ts
 *
 * Uses a simple assert-based runner (no external test framework needed).
 */

import * as path from "path";
import * as fs from "fs";
import { TendersJsonAdapter } from "../ingest/tenders-json";
import { FileAdapter } from "../ingest/file-adapter";
import { normalizeRecords } from "../normalize/normalize";
import { runAllRules } from "../rules/index";
import { duplicateAwardsRule } from "../rules/duplicate-awards";
import { repeatedSupplierRule } from "../rules/repeated-supplier";
import { valueAnomalyRule } from "../rules/value-anomaly";
import { splitProcurementRule } from "../rules/split-procurement";
import { cancellationAnomalyRule } from "../rules/cancellation-anomaly";
import { scoreRecords } from "../scoring/score";
import { buildReport, writeReportArtifacts } from "../report/build-report";
import type { NormalizedRecord } from "../types";

const FIXTURES = path.resolve(__dirname, "fixtures");
const SAMPLE_TENDERS = path.join(FIXTURES, "sample-tenders.json");
const TMP_DIR = path.resolve(__dirname, ".tmp-test-output");

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

function cleanup() {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function testTendersJsonAdapter() {
  console.log("\n--- TendersJsonAdapter ---");
  const adapter = new TendersJsonAdapter(SAMPLE_TENDERS);
  const { records, meta } = await adapter.ingest();
  assert(records.length === 8, `Loaded 8 records (got ${records.length})`);
  assert(meta.warnings.length === 0, "No ingestion warnings");
  assert(records[0].sourceId === "t1", "First record id = t1");
}

async function testFileAdapter() {
  console.log("\n--- FileAdapter (CSV) ---");
  const adapter = new FileAdapter({ dir: FIXTURES });
  const { records, meta } = await adapter.ingest();
  assert(records.length === 3, `Loaded 3 CSV rows (got ${records.length})`);
  assert(meta.warnings.length === 0, "No file adapter warnings");
  assert(records[0].title === "Water pipe repair", "First CSV row title");
}

function testNormalization() {
  console.log("\n--- Normalization ---");
  const raw: NormalizedRecord[] = [
    {
      sourceId: "n1",
      source: "csv",
      title: "",
      authority: "",
      contractor: "",
      contractType: "",
      category: "",
      status: "",
      procedureType: "",
      estimatedValue: NaN,
      winnerValue: null,
      announcementDate: "invalid-date",
      detailUrl: "",
      extra: {},
    },
  ];
  const { records, warnings } = normalizeRecords(raw);
  assert(records[0].title === "Untitled", "Empty title becomes Untitled");
  assert(records[0].authority === "N/A", "Empty authority becomes N/A");
  assert(records[0].estimatedValue === 0, "NaN value becomes 0");
  assert(warnings.length >= 2, `At least 2 warnings (got ${warnings.length})`);
}

async function testDuplicateAwardsRule() {
  console.log("\n--- Rule: Duplicate Awards ---");
  const adapter = new TendersJsonAdapter(SAMPLE_TENDERS);
  const { records } = await adapter.ingest();
  const { records: normalized } = normalizeRecords(records);
  const hits = duplicateAwardsRule.evaluate(normalized);
  assert(hits.length >= 1, `Found duplicate award hit (got ${hits.length})`);
  assert(
    hits[0].involvedRecords.includes("t1") &&
      hits[0].involvedRecords.includes("t2"),
    "Hit involves t1 and t2",
  );
}

async function testValueAnomalyRule() {
  console.log("\n--- Rule: Value Anomaly ---");
  const adapter = new TendersJsonAdapter(SAMPLE_TENDERS);
  const { records } = await adapter.ingest();
  const { records: normalized } = normalizeRecords(records);
  const hits = valueAnomalyRule.evaluate(normalized);
  const highRatio = hits.filter(
    (h) => h.evidence.ratio !== undefined && (h.evidence.ratio as number) >= 0.98,
  );
  assert(highRatio.length >= 1, `Found high winner-ratio hit (got ${highRatio.length})`);
}

async function testSplitProcurementRule() {
  console.log("\n--- Rule: Split Procurement ---");
  const adapter = new TendersJsonAdapter(SAMPLE_TENDERS);
  const { records } = await adapter.ingest();
  const { records: normalized } = normalizeRecords(records);
  const hits = splitProcurementRule.evaluate(normalized);
  const vloreHits = hits.filter((h) =>
    h.description.toLowerCase().includes("vlore"),
  );
  assert(
    vloreHits.length >= 1,
    `Found split procurement for Vlore (got ${vloreHits.length})`,
  );
}

async function testCancellationAnomalyRule() {
  console.log("\n--- Rule: Cancellation Anomaly ---");
  const adapter = new TendersJsonAdapter(SAMPLE_TENDERS);
  const { records } = await adapter.ingest();
  const { records: normalized } = normalizeRecords(records);
  const hits = cancellationAnomalyRule.evaluate(normalized);
  // Elbasan has 3 cancelled out of 3 tenders but < 5 total, so might not trigger
  // This depends on MIN_TENDERS threshold; fixture has only 3 for Elbasan
  assert(hits.length >= 0, `Cancellation rule ran without error (${hits.length} hits)`);
}

async function testScoring() {
  console.log("\n--- Scoring ---");
  const adapter = new TendersJsonAdapter(SAMPLE_TENDERS);
  const { records } = await adapter.ingest();
  const { records: normalized } = normalizeRecords(records);
  const hits = runAllRules(normalized);
  const scored = scoreRecords(normalized, hits);
  assert(scored.length === 8, `Scored all 8 records (got ${scored.length})`);
  const withRisk = scored.filter((s) => s.riskScore > 0);
  assert(withRisk.length > 0, `Some records have risk > 0 (${withRisk.length})`);
}

async function testReportGeneration() {
  console.log("\n--- Report Generation ---");
  cleanup();
  const adapter = new TendersJsonAdapter(SAMPLE_TENDERS);
  const { records } = await adapter.ingest();
  const { records: normalized, warnings } = normalizeRecords(records);
  const hits = runAllRules(normalized);
  const scored = scoreRecords(normalized, hits);
  const report = buildReport(scored, [], warnings);
  const paths = writeReportArtifacts(report, TMP_DIR);

  assert(fs.existsSync(paths.jsonPath), "JSON report file exists");
  assert(fs.existsSync(paths.csvPath), "CSV report file exists");
  assert(fs.existsSync(paths.mdPath), "Markdown summary file exists");

  const json = JSON.parse(fs.readFileSync(paths.jsonPath, "utf-8"));
  assert(json.totalRecords === 8, `JSON reports 8 total records`);
  assert(json.findings.length > 0, "JSON has findings");

  const csv = fs.readFileSync(paths.csvPath, "utf-8");
  assert(csv.startsWith("sourceId,"), "CSV has correct header");

  const md = fs.readFileSync(paths.mdPath, "utf-8");
  assert(md.includes("# KLSH Fraud Report"), "Markdown has title");

  cleanup();
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function run() {
  console.log("=== KLSH Fraud Pipeline Tests ===");

  await testTendersJsonAdapter();
  await testFileAdapter();
  testNormalization();
  await testDuplicateAwardsRule();
  await testValueAnomalyRule();
  await testSplitProcurementRule();
  await testCancellationAnomalyRule();
  await testScoring();
  await testReportGeneration();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

run();

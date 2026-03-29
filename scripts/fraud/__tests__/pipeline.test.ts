import { describe, it, expect, afterAll } from "vitest";
import * as path from "path";
import * as fs from "fs";
import { TendersJsonAdapter } from "../ingest/tenders-json";
import { FileAdapter } from "../ingest/file-adapter";
import { normalizeRecords } from "../normalize/normalize";
import { runAllRules } from "../rules/index";
import { duplicateAwardsRule } from "../rules/duplicate-awards";
import { valueAnomalyRule } from "../rules/value-anomaly";
import { splitProcurementRule } from "../rules/split-procurement";
import { cancellationAnomalyRule } from "../rules/cancellation-anomaly";
import { scoreRecords } from "../scoring/score";
import { buildReport, writeReportArtifacts } from "../report/build-report";
import type { NormalizedRecord } from "../types";

const FIXTURES = path.resolve(__dirname, "fixtures");
const SAMPLE_TENDERS = path.join(FIXTURES, "sample-tenders.json");
const TMP_DIR = path.resolve(__dirname, ".tmp-test-output");

function cleanup() {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
}

afterAll(cleanup);

describe("TendersJsonAdapter", () => {
  it("loads all records from sample fixture", async () => {
    const adapter = new TendersJsonAdapter(SAMPLE_TENDERS);
    const { records, meta } = await adapter.ingest();
    expect(records).toHaveLength(8);
    expect(meta.warnings).toHaveLength(0);
    expect(records[0].sourceId).toBe("t1");
  });
});

describe("FileAdapter (CSV)", () => {
  it("loads CSV rows from fixtures directory", async () => {
    const adapter = new FileAdapter({ dir: FIXTURES });
    const { records, meta } = await adapter.ingest();
    expect(records).toHaveLength(3);
    expect(meta.warnings).toHaveLength(0);
    expect(records[0].title).toBe("Water pipe repair");
  });
});

describe("Normalization", () => {
  it("handles empty and invalid fields gracefully", () => {
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
    expect(records[0].title).toBe("Untitled");
    expect(records[0].authority).toBe("N/A");
    expect(records[0].estimatedValue).toBe(0);
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Rule: Duplicate Awards", () => {
  it("detects duplicate awards in sample data", async () => {
    const adapter = new TendersJsonAdapter(SAMPLE_TENDERS);
    const { records } = await adapter.ingest();
    const { records: normalized } = normalizeRecords(records);
    const hits = duplicateAwardsRule.evaluate(normalized);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].involvedRecords).toContain("t1");
    expect(hits[0].involvedRecords).toContain("t2");
  });
});

describe("Rule: Value Anomaly", () => {
  it("flags high winner-to-estimated ratio", async () => {
    const adapter = new TendersJsonAdapter(SAMPLE_TENDERS);
    const { records } = await adapter.ingest();
    const { records: normalized } = normalizeRecords(records);
    const hits = valueAnomalyRule.evaluate(normalized);
    const highRatio = hits.filter(
      (h) => h.evidence.ratio !== undefined && (h.evidence.ratio as number) >= 0.98,
    );
    expect(highRatio.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Rule: Split Procurement", () => {
  it("detects split procurement for Vlore", async () => {
    const adapter = new TendersJsonAdapter(SAMPLE_TENDERS);
    const { records } = await adapter.ingest();
    const { records: normalized } = normalizeRecords(records);
    const hits = splitProcurementRule.evaluate(normalized);
    const vloreHits = hits.filter((h) =>
      h.description.toLowerCase().includes("vlore"),
    );
    expect(vloreHits.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Rule: Cancellation Anomaly", () => {
  it("runs without errors and produces valid output", async () => {
    const adapter = new TendersJsonAdapter(SAMPLE_TENDERS);
    const { records } = await adapter.ingest();
    const { records: normalized } = normalizeRecords(records);
    const hits = cancellationAnomalyRule.evaluate(normalized);
    expect(Array.isArray(hits)).toBe(true);
    for (const hit of hits) {
      expect(hit.ruleId).toBe("cancellation-anomaly");
      expect(hit.involvedRecords.length).toBeGreaterThan(0);
    }
  });
});

describe("Scoring", () => {
  it("scores all records and flags some with risk", async () => {
    const adapter = new TendersJsonAdapter(SAMPLE_TENDERS);
    const { records } = await adapter.ingest();
    const { records: normalized } = normalizeRecords(records);
    const hits = runAllRules(normalized);
    const scored = scoreRecords(normalized, hits);
    expect(scored).toHaveLength(8);
    const withRisk = scored.filter((s) => s.riskScore > 0);
    expect(withRisk.length).toBeGreaterThan(0);
  });
});

describe("Report Generation", () => {
  it("produces JSON, CSV, and Markdown report files", async () => {
    cleanup();
    const adapter = new TendersJsonAdapter(SAMPLE_TENDERS);
    const { records } = await adapter.ingest();
    const { records: normalized, warnings } = normalizeRecords(records);
    const hits = runAllRules(normalized);
    const scored = scoreRecords(normalized, hits);
    const report = buildReport(scored, [], warnings);
    const paths = writeReportArtifacts(report, TMP_DIR);

    expect(fs.existsSync(paths.jsonPath)).toBe(true);
    expect(fs.existsSync(paths.csvPath)).toBe(true);
    expect(fs.existsSync(paths.mdPath)).toBe(true);

    const json = JSON.parse(fs.readFileSync(paths.jsonPath, "utf-8"));
    expect(json.totalRecords).toBe(8);
    expect(json.findings.length).toBeGreaterThan(0);

    const csv = fs.readFileSync(paths.csvPath, "utf-8");
    expect(csv.startsWith("sourceId,")).toBe(true);

    const md = fs.readFileSync(paths.mdPath, "utf-8");
    expect(md).toContain("# KLSH Fraud Report");
  });
});

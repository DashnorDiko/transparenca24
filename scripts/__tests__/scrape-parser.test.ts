import { describe, it, expect } from "vitest";
import {
  parseTenderRows,
  idFromDetailUrl,
  dedupeKey,
  enrichFromDetailHtml,
  stableId,
} from "../lib/scrape-parser";
import type { ScrapedTender } from "../../lib/tender-types";

const LIST_HTML = `
<!DOCTYPE html>
<html><body>
<table id="results_table">
  <thead><tr>
    <th>Autoriteti Prokurues</th>
    <th>Objekti i Tenderit</th>
    <th>Vlera</th>
    <th>Statusi</th>
    <th>Operator</th>
    <th>Vlera fituese</th>
  </tr></thead>
  <tbody>
    <tr>
      <td>Bashkia Test</td>
      <td><a href="/sq/tender/view/99901">Road works 2025</a></td>
      <td>1,000,000</td>
      <td>Shpallur Procedura</td>
      <td></td>
      <td></td>
    </tr>
  </tbody>
</table>
</body></html>
`;

describe("parseTenderRows", () => {
  it("parses results_table with header mapping", () => {
    const rows = parseTenderRows(LIST_HTML, "municipal");
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toContain("Road works");
    expect(rows[0].authority).toBe("Bashkia Test");
    expect(rows[0].estimatedValue).toBe(1_000_000);
    expect(rows[0].status).toBe("Shpallur Procedura");
    expect(rows[0].id).toBe("op-99901");
  });
});

describe("idFromDetailUrl", () => {
  it("extracts numeric id from path", () => {
    expect(idFromDetailUrl("https://openprocurement.al/sq/tender/view/42", "m", "t", "a")).toBe("op-42");
  });

  it("falls back to stableId when no id in URL", () => {
    const s = stableId("m", "Hello", "Auth");
    expect(idFromDetailUrl("", "m", "Hello", "Auth")).toBe(s);
  });
});

describe("dedupeKey", () => {
  it("uses id prefix for portal ids", () => {
    const t: ScrapedTender = {
      id: "op-1",
      title: "x",
      authority: "y",
      contractor: "",
      contractType: "",
      estimatedValue: 0,
      winnerValue: null,
      status: "",
      procedureType: "",
      announcementDate: "",
      detailUrl: "",
      category: "",
    };
    expect(dedupeKey(t)).toBe("id:op-1");
  });
});

describe("enrichFromDetailHtml", () => {
  it("finds first date and procedure in body text", () => {
    const html = `<html><body>
      <p>Procedurë e Hapur</p>
      <span>Published 15/03/2025</span>
    </body></html>`;
    const e = enrichFromDetailHtml(html);
    expect(e.announcementDate).toBe("2025-03-15");
    expect(e.procedureType).toBe("Procedurë e Hapur");
  });
});

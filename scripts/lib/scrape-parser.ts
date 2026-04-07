/**
 * HTML parsing for openprocurement.al tender listings.
 * Used by scrape-tenders.ts and Vitest fixtures.
 */

import * as cheerio from "cheerio";
import * as crypto from "crypto";
import type { ScrapedTender } from "../../lib/tender-types";

export const BASE_URL = "https://openprocurement.al";

export function stableId(source: string, title: string, authority: string): string {
  const raw = `${source}::${title}::${authority}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);
}

/** Prefer portal id from URL path or query; fallback to stableId */
export function idFromDetailUrl(
  detailUrl: string,
  source: string,
  title: string,
  authority: string,
): string {
  if (!detailUrl) return stableId(source, title, authority);
  try {
    const u = new URL(detailUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (/^\d+$/.test(parts[i])) return `op-${parts[i]}`;
    }
    for (const param of ["id", "tender", "tender_id"]) {
      const v = u.searchParams.get(param);
      if (v && /^\d+$/.test(v)) return `op-${v}`;
    }
  } catch {
    /* ignore */
  }
  return stableId(source, title, authority);
}

export function dedupeKey(t: ScrapedTender): string {
  if (t.id.startsWith("op-")) return `id:${t.id}`;
  return `ta:${t.title}::${t.authority}`;
}

type ColumnKey = "authority" | "title" | "value" | "status" | "contractor" | "winner";

const DEFAULT_COL: Record<ColumnKey, number> = {
  authority: 0,
  title: 1,
  value: 2,
  status: 3,
  contractor: 4,
  winner: 5,
};

function resolveColumnMap(
  $: cheerio.CheerioAPI,
  // Cheerio's element type differs across versions/build targets; we only rely on .find/.first/.each.
  $table: cheerio.Cheerio<any>,
): Record<ColumnKey, number> {
  const out = { ...DEFAULT_COL };
  const $ths = $table.find("thead tr").first().find("th");
  if ($ths.length < 3) return out;

  $ths.each((i, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (/autoritet|prokurues/.test(text)) out.authority = i;
    if ((/objekt|titull/.test(text) || /tender(?!a)/.test(text)) && !/fitues/.test(text)) {
      out.title = i;
    }
    if (/status/.test(text)) out.status = i;
    if (/operator|ekonomik|kontraktues/.test(text)) out.contractor = i;
    if (/vlera/.test(text) && /fitues/.test(text)) out.winner = i;
    else if ((/vlera|fond|limit/.test(text)) && !/fitues/.test(text)) out.value = i;
  });

  return out;
}

export function parseLekValue(text: string): number {
  let cleaned = text.replace(/[^\d.,]/g, "");
  const dotDecimalMatch = cleaned.match(/^([\d,]+)\.(\d{1,2})$/);
  if (dotDecimalMatch) {
    cleaned = dotDecimalMatch[1].replace(/,/g, "");
    return Math.round(parseFloat(cleaned));
  }
  cleaned = cleaned.replace(/,/g, "").replace(/\.(?=\d{3})/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : Math.round(val);
}

export function inferCategory(title: string): string {
  const lower = title.toLowerCase();
  if (
    lower.includes("spital") ||
    lower.includes("mjek") ||
    lower.includes("shëndet") ||
    lower.includes("shendet") ||
    lower.includes("vaksin") ||
    lower.includes("barna")
  )
    return "Shëndetësi";
  if (
    lower.includes("shkoll") ||
    lower.includes("arsim") ||
    lower.includes("libr") ||
    lower.includes("konvikt")
  )
    return "Arsim";
  if (
    lower.includes("rrugë") ||
    lower.includes("rruge") ||
    lower.includes("ura ") ||
    lower.includes("asfalt") ||
    lower.includes("rikualifikim") ||
    lower.includes("rikonstruksion") ||
    lower.includes("kanalizim") ||
    lower.includes("ujësjell") ||
    lower.includes("ujesjell")
  )
    return "Infrastrukturë";
  if (
    lower.includes("ndriçim") ||
    lower.includes("ndricim") ||
    lower.includes("energji") ||
    lower.includes("elektrik") ||
    lower.includes("fotovoltaik")
  )
    return "Energji";
  if (
    lower.includes("pastrim") ||
    lower.includes("mjedis") ||
    lower.includes("mbetje") ||
    lower.includes("gjelbërim") ||
    lower.includes("gjelberim")
  )
    return "Mjedisi";
  if (lower.includes("sport") || lower.includes("stadium") || lower.includes("fushe sportive"))
    return "Sport";
  if (
    lower.includes("kultur") ||
    lower.includes("restaur") ||
    lower.includes("muze") ||
    lower.includes("festival") ||
    lower.includes("aktivitet")
  )
    return "Kulturë";
  if (
    lower.includes("siguri") ||
    lower.includes("polic") ||
    lower.includes("surveil") ||
    lower.includes("kamera")
  )
    return "Siguria";
  if (
    lower.includes("ushqim") ||
    lower.includes("buke") ||
    lower.includes("perime") ||
    lower.includes("mish") ||
    lower.includes("bulmet") ||
    lower.includes("fruta") ||
    lower.includes("karburant") ||
    lower.includes("gazoil")
  )
    return "Furnizime";
  return "Administratë";
}

function inferProcedureType(
  cells: ReturnType<cheerio.CheerioAPI>,
  $: cheerio.CheerioAPI,
): string {
  for (let i = 0; i < cells.length; i++) {
    const text = $(cells[i]).text().trim().toLowerCase();
    if (text.includes("procedurë e hapur") || text.includes("procedure e hapur"))
      return "Procedurë e Hapur";
    if (text.includes("kërkesë për propozim") || text.includes("kerkese per propozim"))
      return "Kërkesë për Propozim";
    if (text.includes("negocim")) return "Procedurë me Negocim";
    if (text.includes("vlerë të vogël") || text.includes("vlere te vogel"))
      return "Blerje me Vlerë të Vogël";
    if (text.includes("kufizuar")) return "Procedurë e Kufizuar";
    if (text.includes("kuadër") || text.includes("kuader")) return "Marrëveshje Kuadër";
    if (text.includes("drejtpërdrejt")) return "Procedurë e drejtpërdrejtë";
  }
  return "Procedurë e Hapur";
}

const DATE_REGEX = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/;

function inferDate(cells: ReturnType<cheerio.CheerioAPI>, $: cheerio.CheerioAPI): string {
  for (let i = 0; i < cells.length; i++) {
    const text = $(cells[i]).text().trim();
    const match = text.match(DATE_REGEX);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  return "";
}

function parseRow(
  $: cheerio.CheerioAPI,
  cells: ReturnType<cheerio.CheerioAPI>,
  col: Record<ColumnKey, number>,
  source: "municipal" | "health",
): ScrapedTender | null {
  const n = cells.length;
  const ai = Math.min(col.authority, n - 1);
  const ti = Math.min(col.title, n - 1);
  const vi = Math.min(col.value, n - 1);
  const si = Math.min(col.status, n - 1);

  const authority = cells.eq(ai).text().trim();
  const titleEl = cells.eq(ti);
  const title = titleEl.text().trim();
  const link = titleEl.find("a").attr("href") || "";
  const detailUrl = link.startsWith("http")
    ? link
    : link
      ? `${BASE_URL}${link}`
      : "";

  const estimatedValue = parseLekValue(cells.eq(vi).text().trim());
  const status = cells.eq(si).text().trim() || "Shpallur";
  const ci = Math.min(col.contractor, n - 1);
  const wi = Math.min(col.winner, n - 1);
  const contractor = n > ci ? cells.eq(ci).text().trim() : "";
  const winnerText = n > wi ? cells.eq(wi).text().trim() : "";
  const winnerValue = winnerText ? parseLekValue(winnerText) : null;

  if (title.length <= 3) return null;

  const id = idFromDetailUrl(detailUrl, source, title, authority);

  return {
    id,
    title,
    authority,
    contractor,
    contractType: source === "health" ? "Shëndetësi" : "Kontrata Publike",
    estimatedValue,
    winnerValue: winnerValue && winnerValue > 0 ? winnerValue : null,
    status,
    procedureType: inferProcedureType(cells, $),
    announcementDate: inferDate(cells, $),
    detailUrl,
    category: inferCategory(title),
  };
}

function parseTableBody(
  $: cheerio.CheerioAPI,
  $table: cheerio.Cheerio<any>,
  source: "municipal" | "health",
): ScrapedTender[] {
  const col = resolveColumnMap($, $table);
  const tenders: ScrapedTender[] = [];
  $table.find("tbody tr").each((_i, el) => {
    const cells = $(el).find("td");
    if (cells.length < 4) return;
    const row = parseRow($, cells, col, source);
    if (row) tenders.push(row);
  });
  return tenders;
}

/**
 * Parse tender rows from a full list page HTML (results_table or fallback table.table).
 */
export function parseTenderRows(html: string, source: "municipal" | "health"): ScrapedTender[] {
  const $ = cheerio.load(html);

  const $results = $("#results_table");
  if ($results.length > 0) {
    const list = parseTableBody($, $results, source);
    if (list.length > 0) return list;
  }

  const $fallback = $("table.table").first();
  if ($fallback.length > 0) {
    return parseTableBody($, $fallback, source);
  }

  return [];
}

/**
 * Extract announcement date and procedure hints from a tender detail page HTML.
 */
export function enrichFromDetailHtml(html: string): {
  announcementDate?: string;
  procedureType?: string;
} {
  const $ = cheerio.load(html);
  const bodyText = $("body").text();
  let announcementDate: string | undefined;
  const dates: string[] = [];
  let m: RegExpExecArray | null;
  const re = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/g;
  while ((m = re.exec(bodyText)) !== null) {
    const [, day, month, year] = m;
    dates.push(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
  }
  if (dates.length > 0) announcementDate = dates[0];

  let procedureType: string | undefined;
  const lower = bodyText.toLowerCase();
  if (lower.includes("procedurë e hapur") || lower.includes("procedure e hapur"))
    procedureType = "Procedurë e Hapur";
  else if (lower.includes("kërkesë për propozim") || lower.includes("kerkese per propozim"))
    procedureType = "Kërkesë për Propozim";
  else if (lower.includes("negocim")) procedureType = "Procedurë me Negocim";

  return { announcementDate, procedureType };
}

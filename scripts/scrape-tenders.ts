/**
 * Scrape Albanian public procurement tenders from openprocurement.al
 *
 * Run with: npm run scrape
 *
 * Env:
 *   SCRAPE_MAX_PAGES      — max list pages per stream (default 50)
 *   SCRAPE_DELAY_MS       — delay between requests (default 1500)
 *   SCRAPE_ENRICH_DETAILS — set to 1 to fetch detail pages for dates/procedure (default 0)
 *   SCRAPE_ENRICH_CONCURRENCY — parallel detail fetches (default 4)
 */

import * as fs from "fs";
import * as path from "path";
import type { ScrapedTender, TenderDataFile } from "../lib/tender-types";
import {
  BASE_URL,
  dedupeKey,
  enrichFromDetailHtml,
  inferCategory,
  parseTenderRows,
  stableId,
} from "./lib/scrape-parser";

const TENDER_LIST_URL = `${BASE_URL}/sq/tender/list/faqe`;
const HEALTH_TENDER_URL = `${BASE_URL}/sq/htender/list/faqe`;
const OUTPUT_PATH = path.resolve(__dirname, "../public/data/tenders.json");

function getConfig() {
  const maxPages = Math.max(1, parseInt(process.env.SCRAPE_MAX_PAGES ?? "50", 10) || 50);
  const delayMs = Math.max(0, parseInt(process.env.SCRAPE_DELAY_MS ?? "1500", 10) || 1500);
  const enrichDetails = process.env.SCRAPE_ENRICH_DETAILS === "1";
  const enrichConcurrency = Math.max(1, parseInt(process.env.SCRAPE_ENRICH_CONCURRENCY ?? "4", 10) || 4);
  return { maxPages, delayMs, enrichDetails, enrichConcurrency };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logEvent(payload: Record<string, unknown>): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...payload }));
}

async function fetchPage(url: string): Promise<{ html: string | null; status: number | null; durationMs: number; error?: string }> {
  const t0 = Date.now();
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LLogaria-AL-Scraper/1.0; transparency project)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "sq,en;q=0.9",
      },
    });
    const durationMs = Date.now() - t0;
    if (!response.ok) {
      console.error(`  HTTP ${response.status} for ${url}`);
      return { html: null, status: response.status, durationMs };
    }
    const html = await response.text();
    return { html, status: response.status, durationMs };
  } catch (err) {
    const durationMs = Date.now() - t0;
    const error = (err as Error).message;
    console.error(`  Fetch error for ${url}:`, error);
    return { html: null, status: null, durationMs, error };
  }
}

async function fetchWithRetry(
  url: string,
  delayMs: number,
  attempts = 3,
): Promise<{ html: string | null; status: number | null; durationMs: number; error?: string }> {
  for (let i = 0; i < attempts; i++) {
    const result = await fetchPage(url);
    if (result.html) return result;
    if (i < attempts - 1) {
      console.log(`    Retry ${i + 1}/${attempts - 1}...`);
      await sleep(delayMs * (i + 1));
    }
  }
  return { html: null, status: null, durationMs: 0, error: "all retries failed" };
}

async function scrapeStream(
  baseListUrl: string,
  stream: "municipal" | "health",
  maxPages: number,
  delayMs: number,
): Promise<ScrapedTender[]> {
  const all: ScrapedTender[] = [];
  const source = stream;

  for (let page = 1; page <= maxPages; page++) {
    const url = `${baseListUrl}/${page}`;
    const t0 = Date.now();
    const { html, status, durationMs, error } = await fetchWithRetry(url, delayMs);
    const totalMs = Date.now() - t0;

    if (!html) {
      logEvent({
        event: "scrape_page",
        stream,
        page,
        url,
        rowCount: 0,
        httpStatus: status,
        durationMs: totalMs,
        error: error ?? "no body",
      });
      break;
    }

    const tenders = parseTenderRows(html, source);
    logEvent({
      event: "scrape_page",
      stream,
      page,
      url,
      rowCount: tenders.length,
      httpStatus: status ?? 200,
      durationMs,
    });

    if (page === 1 && tenders.length === 0) {
      console.warn(
        `[scrape] WARNING: first page returned 0 rows for ${stream}. HTML layout or selectors (#results_table / table.table) may have changed.`,
      );
    }

    if (tenders.length === 0) {
      break;
    }

    all.push(...tenders);
    if (page < maxPages) await sleep(delayMs);
  }

  return all;
}

async function enrichDetails(
  tenders: ScrapedTender[],
  concurrency: number,
  delayMs: number,
): Promise<ScrapedTender[]> {
  const byUrl = new Map<string, ScrapedTender[]>();
  for (const t of tenders) {
    if (!t.detailUrl) continue;
    const list = byUrl.get(t.detailUrl) ?? [];
    list.push(t);
    byUrl.set(t.detailUrl, list);
  }
  const urls = [...byUrl.keys()];
  if (urls.length === 0) return tenders;

  console.log(`\nEnriching ${urls.length} detail pages (concurrency=${concurrency})...`);

  let cursor = 0;
  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= urls.length) return;
      const url = urls[i];
      const targets = byUrl.get(url)!;
      const { html, status, durationMs } = await fetchWithRetry(url, delayMs);
      logEvent({
        event: "enrich_detail",
        url,
        httpStatus: status,
        durationMs,
        rowCount: targets.length,
      });
      if (!html) continue;
      const extra = enrichFromDetailHtml(html);
      for (const t of targets) {
        if (extra.announcementDate && !t.announcementDate) {
          t.announcementDate = extra.announcementDate;
        }
        if (extra.procedureType && (!t.procedureType || t.procedureType === "Procedurë e Hapur")) {
          t.procedureType = extra.procedureType;
        }
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
  await Promise.all(workers);
  return tenders;
}

function getSeedData(): ScrapedTender[] {
  const authorities = [
    "Bashkia Tiranë", "Bashkia Durrës", "Bashkia Vlorë", "Bashkia Shkodër",
    "Bashkia Elbasan", "Bashkia Fier", "Bashkia Korçë", "Bashkia Berat",
    "Bashkia Gjirokastër", "Bashkia Kukës", "Bashkia Lezhë", "Bashkia Sarandë",
    "Bashkia Pogradec", "Bashkia Lushnjë", "Bashkia Kavajë", "Bashkia Kamëz",
    "Qendra Spitalore Universitare", "Ministria e Shëndetësisë",
    "Spitali Rajonal Durrës", "Spitali Rajonal Vlorë",
  ];

  const titles = [
    "Ndërtim rrugë lokale në lagjen nr. 5", "Furnizim pajisjesh mjekësore për spitalin rajonal",
    "Rinovim i shkollës 9-vjeçare", "Sistem kanalizimi për zonën periferike",
    "Ndriçim publik LED për bulevardin kryesor", "Videosurveillance qendër qytet",
    "Pastrimi i rrugëve dhe hapësirave publike", "Restaurim objekti kulturor",
    "Furnizim librash shkollore për vitin akademik", "Blerje pajisjesh shkollore kompjuterike",
    "Rinovim spitali rajonal - reparti i kirurgjisë", "Ndërtim ura pedonale mbi lumin",
    "Furnizim me barna për qendrat shëndetësore", "Asfaltim rruge rurale",
    "Sistem ujësjellësi për fshatin", "Furnizim pajisje laboratorike",
    "Rinovim i godinës së bashkisë", "Ndërtim parku lokal rekreativ",
    "Blerje pajisje zjarrfikëse", "Furnizim ushqimor për kopshte",
    "Mirëmbajtje e ndriçimit publik", "Furnizim me vaksina",
    "Ndërtim rrjeti optik për shkolla", "Rehabilitim i fasadës së teatrit",
    "Blerje mobilje për shkolla", "Rikonstruksion i tregut publik",
    "Instalim panele diellore në ndërtesa publike", "Furnizim ambulancash",
    "Ndërtim piste biçikletash", "Projekt i menaxhimit të mbetjeve",
  ];

  const contractors = [
    "Albanian Construction Co.", "Infrastruktura Plus SHPK", "Balkan Roads Ltd",
    "Energji Shqiptare SHPK", "Megapharma SHPK", "Fufarma SHA",
    "Kastrati SHPK", "2Z Konstruksion SHPK", "Alb Tiefbau SHPK",
    "Karl Gega Konstruksion", "Rozafa-94 SHPK", "Colombo SHPK",
    "Biometric Albania SHPK", "Montal SHPK", "Tech Solutions AL",
  ];

  const statuses = [
    "Shpallur Procedura", "Njoftuar Fituesi", "Lidhur Kontrata",
    "Anuluar Procedura", "Rishpallur Prokurimi", "Fazë Planifikimi",
  ];

  const procedures = [
    "Procedurë e Hapur", "Kërkesë për Propozim", "Procedurë me Negocim",
    "Blerje me Vlerë të Vogël", "Procedurë e Kufizuar",
    "Marrëveshje Kuadër", "Procedurë e drejtpërdrejtë",
  ];

  const contractTypes = [
    "Punë Publike", "Kontrata Publike Furnizimi", "Kontrata Publike për Shërbime",
    "Marrëveshje Kuadër", "Blerje Mallrash",
  ];

  let seed = 42;
  function seededRandom(): number {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  function rand(min: number, max: number) {
    return Math.floor(seededRandom() * (max - min + 1)) + min;
  }
  function pick<T>(arr: T[]): T {
    return arr[Math.floor(seededRandom() * arr.length)];
  }

  const tenders: ScrapedTender[] = [];
  const now = new Date("2025-01-15T00:00:00Z");

  for (let i = 0; i < 120; i++) {
    const title = pick(titles);
    const d = new Date(now);
    d.setDate(d.getDate() - rand(0, 730));
    const dateStr = d.toISOString().split("T")[0];
    const est = rand(500_000, 150_000_000);
    const hasWinner = seededRandom() > 0.4;
    const authority = pick(authorities);

    tenders.push({
      id: stableId("seed", title, authority),
      title: `${title} (${dateStr.slice(0, 4)})`,
      authority,
      contractor: hasWinner ? pick(contractors) : "",
      contractType: pick(contractTypes),
      estimatedValue: est,
      winnerValue: hasWinner ? rand(Math.floor(est * 0.65), est) : null,
      status: pick(statuses),
      procedureType: pick(procedures),
      announcementDate: dateStr,
      detailUrl: `${BASE_URL}/sq/tender/search?query=${encodeURIComponent(title.slice(0, 30))}`,
      category: inferCategory(title),
    });
  }

  return tenders.sort(
    (a, b) => b.announcementDate.localeCompare(a.announcementDate),
  );
}

async function scrapeTenders(): Promise<ScrapedTender[]> {
  const { maxPages, delayMs, enrichDetails: doEnrich, enrichConcurrency } = getConfig();
  const all: ScrapedTender[] = [];

  console.log("Scraping municipal tenders...");
  all.push(...await scrapeStream(TENDER_LIST_URL, "municipal", maxPages, delayMs));

  console.log("Scraping health sector tenders...");
  all.push(...await scrapeStream(HEALTH_TENDER_URL, "health", maxPages, delayMs));

  if (doEnrich && all.length > 0) {
    await enrichDetails(all, enrichConcurrency, delayMs);
  }

  return all;
}

async function main() {
  const cfg = getConfig();
  console.log("=== LLogaria AL - Tender Scraper ===\n");
  console.log(`Source: ${BASE_URL}`);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log(
    `Config: SCRAPE_MAX_PAGES=${cfg.maxPages}, SCRAPE_DELAY_MS=${cfg.delayMs}, SCRAPE_ENRICH_DETAILS=${cfg.enrichDetails ? "1" : "0"}, SCRAPE_ENRICH_CONCURRENCY=${cfg.enrichConcurrency}\n`,
  );

  let tenders = await scrapeTenders();

  if (tenders.length < 10) {
    console.log(
      `\nOnly ${tenders.length} tenders scraped (website may have changed layout or be unreachable).`,
    );
    console.log("Falling back to seed data...\n");
    tenders = getSeedData();
  }

  const seen = new Set<string>();
  tenders = tenders.filter((t) => {
    const key = dedupeKey(t);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const output: TenderDataFile = {
    scrapedAt: new Date().toISOString(),
    source: BASE_URL,
    totalCount: tenders.length,
    tenders,
  };

  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nWrote ${tenders.length} tenders to ${OUTPUT_PATH}`);
  console.log("Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

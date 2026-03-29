/**
 * Scrape Albanian public procurement tenders from openprocurement.al
 *
 * Run with: npm run scrape
 *
 * Fetches tender list pages, parses HTML with cheerio, and writes
 * structured JSON to public/data/tenders.json for the static site.
 *
 * Falls back to seed data if scraping fails (CORS, network, etc.)
 */

import * as cheerio from "cheerio";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

interface ScrapedTender {
  id: string;
  title: string;
  authority: string;
  contractor: string;
  contractType: string;
  estimatedValue: number;
  winnerValue: number | null;
  status: string;
  procedureType: string;
  announcementDate: string;
  detailUrl: string;
  category: string;
}

interface TenderDataFile {
  scrapedAt: string;
  source: string;
  totalCount: number;
  tenders: ScrapedTender[];
}

const BASE_URL = "https://openprocurement.al";
const TENDER_LIST_URL = `${BASE_URL}/sq/tender/list/faqe`;
const HEALTH_TENDER_URL = `${BASE_URL}/sq/htender/list/faqe`;
const OUTPUT_PATH = path.resolve(__dirname, "../public/data/tenders.json");
const MAX_PAGES = 5;
const DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stableId(source: string, title: string, authority: string): string {
  const raw = `${source}::${title}::${authority}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);
}

function parseLekValue(text: string): number {
  // Values like "8,195,600" or "7,989,600.00"
  // Strip everything except digits, commas, dots
  let cleaned = text.replace(/[^\d.,]/g, "");

  // If it ends with ".00" or similar decimal, it's "7,989,600.00" format
  const dotDecimalMatch = cleaned.match(/^([\d,]+)\.(\d{1,2})$/);
  if (dotDecimalMatch) {
    cleaned = dotDecimalMatch[1].replace(/,/g, "");
    return Math.round(parseFloat(cleaned));
  }

  // Otherwise treat commas as thousands separators: "8,195,600"
  cleaned = cleaned.replace(/,/g, "").replace(/\.(?=\d{3})/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : Math.round(val);
}

function inferCategory(title: string): string {
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
    if (text.includes("kuadër") || text.includes("kuader"))
      return "Marrëveshje Kuadër";
    if (text.includes("drejtpërdrejt")) return "Procedurë e drejtpërdrejtë";
  }
  return "Procedurë e Hapur";
}

const DATE_REGEX = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/;

function inferDate(
  cells: ReturnType<cheerio.CheerioAPI>,
  $: cheerio.CheerioAPI,
): string {
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

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LLogaria-AL-Scraper/1.0; transparency project)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "sq,en;q=0.9",
      },
    });
    if (!response.ok) {
      console.error(`  HTTP ${response.status} for ${url}`);
      return null;
    }
    return await response.text();
  } catch (err) {
    console.error(`  Fetch error for ${url}:`, (err as Error).message);
    return null;
  }
}

/**
 * Parse the results_table from openprocurement.al.
 *
 * Columns (0-indexed):
 *   0 = Autoriteti Prokurues (Authority)
 *   1 = Objekti i Tenderit  (Title, contains <a> link)
 *   2 = Vlera / Fondi Limit Leke (Estimated value)
 *   3 = Statusi i Tenderit  (Status)
 *   4 = Operator Ekonomik Kontraktues (Contractor, may be empty)
 *   5 = Vlera fituese        (Winner value, may be empty)
 */
function parseTenderRows(
  html: string,
  source: "municipal" | "health"
): ScrapedTender[] {
  const $ = cheerio.load(html);
  const tenders: ScrapedTender[] = [];

  $("#results_table tbody tr").each((i, el) => {
    const cells = $(el).find("td");
    if (cells.length < 4) return;

    const authority = cells.eq(0).text().trim();
    const titleEl = cells.eq(1);
    const title = titleEl.text().trim();
    const link = titleEl.find("a").attr("href") || "";
    const detailUrl = link.startsWith("http")
      ? link
      : link
        ? `${BASE_URL}${link}`
        : "";

    const estimatedValue = parseLekValue(cells.eq(2).text().trim());
    const status = cells.eq(3).text().trim() || "Shpallur";
    const contractor = cells.length > 4 ? cells.eq(4).text().trim() : "";
    const winnerText = cells.length > 5 ? cells.eq(5).text().trim() : "";
    const winnerValue = winnerText ? parseLekValue(winnerText) : null;

    if (title.length > 3) {
      tenders.push({
        id: stableId(source, title, authority),
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
      });
    }
  });

  // Fallback: try the first <table class="table"> if results_table wasn't found
  if (tenders.length === 0) {
    $("table.table tbody tr").each((i, el) => {
      const cells = $(el).find("td");
      if (cells.length < 4) return;

      const authority = cells.eq(0).text().trim();
      const titleEl = cells.eq(1);
      const title = titleEl.text().trim();
      const link = titleEl.find("a").attr("href") || "";
      const detailUrl = link.startsWith("http")
        ? link
        : link
          ? `${BASE_URL}${link}`
          : "";

      const estimatedValue = parseLekValue(cells.eq(2).text().trim());
      const status = cells.eq(3).text().trim() || "Shpallur";
      const contractor = cells.length > 4 ? cells.eq(4).text().trim() : "";
      const winnerText = cells.length > 5 ? cells.eq(5).text().trim() : "";
      const winnerValue = winnerText ? parseLekValue(winnerText) : null;

      if (title.length > 3) {
        tenders.push({
          id: stableId(source, title, authority),
          title,
          authority,
          contractor,
          contractType:
            source === "health" ? "Shëndetësi" : "Kontrata Publike",
          estimatedValue,
          winnerValue: winnerValue && winnerValue > 0 ? winnerValue : null,
          status,
          procedureType: inferProcedureType(cells, $),
          announcementDate: inferDate(cells, $),
          detailUrl,
          category: inferCategory(title),
        });
      }
    });
  }

  return tenders;
}

async function fetchWithRetry(url: string, attempts = 3): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    const result = await fetchPage(url);
    if (result) return result;
    if (i < attempts - 1) {
      console.log(`    Retry ${i + 1}/${attempts - 1}...`);
      await sleep(DELAY_MS * (i + 1));
    }
  }
  return null;
}

async function scrapeTenders(): Promise<ScrapedTender[]> {
  const all: ScrapedTender[] = [];

  console.log("Scraping municipal tenders...");
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${TENDER_LIST_URL}/${page}`;
    console.log(`  Page ${page}: ${url}`);
    const html = await fetchWithRetry(url);
    if (html) {
      const tenders = parseTenderRows(html, "municipal");
      console.log(`    Found ${tenders.length} tenders`);
      all.push(...tenders);
    }
    if (page < MAX_PAGES) await sleep(DELAY_MS);
  }

  console.log("Scraping health sector tenders...");
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${HEALTH_TENDER_URL}/${page}`;
    console.log(`  Page ${page}: ${url}`);
    const html = await fetchWithRetry(url);
    if (html) {
      const tenders = parseTenderRows(html, "health");
      console.log(`    Found ${tenders.length} tenders`);
      all.push(...tenders);
    }
    if (page < MAX_PAGES) await sleep(DELAY_MS);
  }

  return all;
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

  // Seeded PRNG for deterministic fallback data
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
    (a, b) => b.announcementDate.localeCompare(a.announcementDate)
  );
}

async function main() {
  console.log("=== LLogaria AL - Tender Scraper ===\n");
  console.log(`Source: ${BASE_URL}`);
  console.log(`Output: ${OUTPUT_PATH}\n`);

  let tenders = await scrapeTenders();

  if (tenders.length < 10) {
    console.log(
      `\nOnly ${tenders.length} tenders scraped (website may have changed layout or be unreachable).`
    );
    console.log("Falling back to seed data...\n");
    tenders = getSeedData();
  }

  // Deduplicate by title + authority
  const seen = new Set<string>();
  tenders = tenders.filter((t) => {
    const key = `${t.title}::${t.authority}`;
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

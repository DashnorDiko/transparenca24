# Transparenca24 / LLogaria AL

Public procurement transparency platform for Albania. All data is **real**, scraped from [Open Procurement Albania](https://openprocurement.al).

## Features

- **Tenders** — Browse, search and filter all scraped public tenders
- **Analytics** — Charts by category, authority and status (Recharts)
- **Authorities** — Tenders grouped by procuring authority with expandable details
- **Bilingual** — Albanian (default) and English
- **Dark / Light mode** — Full theme support with CSS custom properties

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, static export) |
| Language | TypeScript |
| Styling | Tailwind CSS + Shadcn/UI primitives |
| Charts | Recharts |
| Animations | Framer Motion |
| Scraping | Cheerio (Node.js, build-time) |
| Deployment | GitHub Pages via GitHub Actions |

## Data Source

All tender data comes from **[openprocurement.al](https://openprocurement.al)**, scraped at build time.

The scraper ([scripts/scrape-tenders.ts](scripts/scrape-tenders.ts)) loads listing HTML with Cheerio, parses tables (`#results_table` or fallback `table.table`), and writes JSON to `public/data/tenders.json`. Parsing logic lives in [scripts/lib/scrape-parser.ts](scripts/lib/scrape-parser.ts) (shared with tests). If fewer than 10 tenders are scraped, deterministic seed data is used.

### Scraper behavior

- **Pagination** — For each listing (municipal + health), pages are fetched until a page returns **no rows** or **`SCRAPE_MAX_PAGES`** is reached (whichever comes first).
- **Column mapping** — Table headers are matched to fields when possible; otherwise fixed column indices (0–5) are used.
- **IDs** — Numeric tender IDs are taken from detail URLs (`op-…`) when present; otherwise a stable hash of source + title + authority.
- **Deduplication** — Rows are deduped by portal id when available, else by `title::authority`.
- **Logs** — Each page fetch logs one JSON line (`event: scrape_page` or `enrich_detail`) with `url`, `rowCount`, `httpStatus`, `durationMs` for CI debugging.

### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `SCRAPE_MAX_PAGES` | `50` | Maximum list pages per stream (municipal and health each). |
| `SCRAPE_DELAY_MS` | `1500` | Delay between HTTP requests (milliseconds). |
| `SCRAPE_ENRICH_DETAILS` | `0` | Set to `1` to fetch each tender **detail** page and fill missing dates / procedure text (slower; use sparingly in CI). |
| `SCRAPE_ENRICH_CONCURRENCY` | `4` | Parallel detail fetches when enrichment is enabled. |

### Fair use

Respect [openprocurement.al](https://openprocurement.al) and [robots.txt](https://openprocurement.al/robots.txt). Do not lower `SCRAPE_DELAY_MS` for production or scheduled jobs without need. The default User-Agent identifies this project as an automated transparency scraper.

If the site’s HTML layout changes, the scraper logs a **warning** when the first page of a stream returns zero rows—check selectors in `scrape-parser.ts`.

## Getting Started

```bash
# Install dependencies
npm install

# Scrape tender data (requires internet)
npm run scrape

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build for Production

```bash
npm run build
npm run preview
```

Produces a fully static site in `out/`, ready for any static hosting.
Use `npm run preview` (or `npm start`) to serve the exported `out/` folder locally.

## Deploy to GitHub Pages

1. Push to `main` — the included GitHub Actions workflow (`.github/workflows/deploy.yml`) will:
   - Scrape fresh tender data
   - Build the static site with the correct `basePath`
   - Deploy to GitHub Pages
2. Enable GitHub Pages in repo settings (source: GitHub Actions)

Important: `NEXT_PUBLIC_BASE_PATH` must include a leading slash (example: `/llogaria-al-main`) for project sites.

The workflow also runs daily at 06:00 UTC to refresh data.

## KLSH Fraud Detection Pipeline

An on-demand pipeline that analyses procurement data for potential fraud indicators and emails a compiled report to KLSH (Kontrolli i Lartë i Shtetit).

### How it works

1. **Ingest** — Combines data from the existing tenders.json, external APIs, and CSV/Excel files.
2. **Normalize** — Standardizes fields and emits validation warnings for missing data.
3. **Detect** — Runs five fraud rules (duplicate awards, repeated supplier, value anomalies, split procurement, cancellation anomalies) and computes a weighted risk score per record.
4. **Report** — Generates JSON, CSV, and Markdown report artifacts.
5. **Deliver** — Sends the report via email to KLSH recipients.

### Run locally

```bash
# Generate report without email (dry run)
SKIP_EMAIL=1 npm run fraud-report

# Run the full pipeline including email delivery
npm run fraud-report

# Run tests (app + fraud pipeline + scraper parser)
npm test
```

### Run via GitHub Actions

Go to **Actions > KLSH Fraud Report (on demand) > Run workflow**. You can choose to skip email delivery for testing.

### Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `KLSH_SMTP_HOST` | SMTP server hostname |
| `KLSH_SMTP_PORT` | SMTP port (587 for STARTTLS, 465 for implicit TLS) |
| `KLSH_SMTP_USER` | SMTP username |
| `KLSH_SMTP_PASS` | SMTP password |
| `KLSH_EMAIL_FROM` | Sender email address |
| `KLSH_EMAIL_TO` | Comma-separated recipient email addresses |

Optional secrets for external API sources:

| Secret | Purpose |
|--------|---------|
| `API_FRAUD_URL` | Endpoint to GET for additional procurement data |
| `API_FRAUD_KEY` | Bearer token for the API |

### Adding CSV/Excel data

Place `.csv` files in `data/fraud-input/` (or set `FILE_FRAUD_DIR`). Expected column headers: `id`, `title`, `authority`, `contractor`, `estimatedValue`, `winnerValue`, `status`, `category`. Albanian column names (`objekti`, `autoriteti`, `operatori`, `vlera`, `statusi`, `kategoria`) are also supported.

### Pipeline modules

```
scripts/fraud/
  types.ts              Canonical types for the pipeline
  run-klsh-report.ts    Main orchestrator entry point
  ingest/               Source adapters (tenders JSON, API, CSV/Excel)
  normalize/            Field normalization and validation
  rules/                Fraud detection rules
  scoring/              Risk score computation
  report/               Report artifact generation (JSON, CSV, Markdown)
  deliver/              SMTP email sender
  __tests__/            Test suite and fixtures
```

## Project Structure

```
app/
  page.tsx             Landing page
  dashboard/page.tsx   Analytics dashboard
  tenders/page.tsx     Tender table with filters
  projects/page.tsx    Authorities view
components/
  TenderDataProvider   Shared context — fetches tenders.json once
  LandingContent       Hero + stat cards + recent feed
  DashboardContent     Charts and filtered summary table
  StatCards            Tender count, authorities, winner stats
  LiveFeed             Recent tenders feed
  Header / Footer      Navigation, language/theme toggles
  ui/                  Shadcn/UI primitives
lib/
  i18n.ts              Albanian + English translations
  tender-types.ts      TypeScript interfaces for tender data
  utils.ts             formatLek, cn helper
scripts/
  scrape-tenders.ts    CLI — list scrape + optional detail enrichment
  lib/scrape-parser.ts Table parsing + ID helpers
  fraud/               KLSH fraud detection pipeline
  __tests__/           Parser unit tests
public/data/
  tenders.json         Scraped tender data (generated)
```

## License

MIT

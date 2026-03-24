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

The scraper (`scripts/scrape-tenders.ts`) fetches municipal and health-sector tender listings, parses the HTML tables with Cheerio, and writes structured JSON to `public/data/tenders.json`. If scraping fails, fallback seed data is used.

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

# Run pipeline tests
npm run fraud-test
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
  scrape-tenders.ts    Cheerio-based scraper
  fraud/               KLSH fraud detection pipeline
public/data/
  tenders.json         Scraped tender data (generated)
```

## License

MIT

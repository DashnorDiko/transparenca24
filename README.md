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
public/data/
  tenders.json         Scraped tender data (generated)
```

## License

MIT

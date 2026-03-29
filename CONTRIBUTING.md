# Contributing to LLogaria AL / Transparenca24

Thank you for your interest in contributing to Albanian public procurement transparency.

## Getting Started

```bash
# Clone the repository
git clone https://github.com/<your-fork>/llogaria-al-main.git
cd llogaria-al-main

# Install dependencies
npm install

# Scrape fresh tender data (requires internet)
npm run scrape

# Start the dev server
npm run dev
```

## Development Workflow

1. **Fork** the repository and create a feature branch from `main`.
2. Make your changes — keep commits focused and atomic.
3. Run linting and tests before pushing:
   ```bash
   npm run lint
   npm test
   ```
4. Open a **Pull Request** against `main` with a clear description of the change.

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router pages and layouts |
| `components/` | React components (feature + `ui/` primitives) |
| `lib/` | Shared utilities, types, and i18n translations |
| `scripts/` | Build-time scraper and KLSH fraud pipeline |
| `public/data/` | Generated tender data (do not edit manually) |

## Coding Standards

- **TypeScript** — strict mode, no `any` unless unavoidable.
- **Styling** — Tailwind CSS utility classes. Use the design tokens defined in `globals.css`.
- **i18n** — All user-facing strings go in `lib/i18n.ts`. Never use inline locale ternaries.
- **Accessibility** — All interactive elements must have proper ARIA attributes. Tables need captions. Charts need text alternatives.
- **Testing** — New features should include tests. Run `npm test` to verify.

## Commit Messages

Use concise, imperative-mood messages:
- `fix: extract announcement dates from scraper`
- `feat: add column sorting to tenders table`
- `docs: add CONTRIBUTING.md`

## Reporting Issues

Use the issue templates provided in `.github/ISSUE_TEMPLATE/`. Include steps to reproduce for bug reports.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

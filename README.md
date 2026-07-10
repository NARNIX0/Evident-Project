# Reports to Charts Studio

Turn research tables and documents into slide-ready, Evident-style charts.

## Run locally

```bash
cd studio
npm install
cp .env.example .env   # add MiniMax / Azure / Mistral keys as needed
npm run dev
```

Open http://localhost:3000

## What it does

1. Load sample data, paste a table, upload CSV/TSV (including batch), or upload PDF/image/Word/text for extraction
2. Review and edit extracted tables
3. Get chart recommendations (rules + MiniMax chart council when configured)
4. Preview charts with light/dark themes and blue/orange palettes
5. Export PNG, CSV, and PPTX

## Verify

```bash
cd studio
npm test -- --run
npm run lint
npm run build
```

## Deploy notes

- App root is `studio/`
- Build: `npm run build`
- Start: `npm run start`
- See `studio/.env.example` for required environment variables

## Spec

Product scope lives in `docs/spec.md`.

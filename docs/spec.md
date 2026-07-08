# Reports to Charts Studio — Product Spec

## 1. One-Line Summary

**Reports to Charts Studio turns PDFs, screenshots, CSVs, pasted tables, and research excerpts into polished Evident-style charts, structured datasets, and source-backed captions ready for analyst decks.**

Outreach one-liner:

> Upload messy research material. Get slide-ready charts with extracted data, source traceability, and analyst-style commentary.

## 2. Target Recipient / Stakeholder

- **Primary:** Georgia Atallah / Evident product-data team.
- **Secondary:** Evident data analytics, data science, data engineering, research, and product teams.
- **Tertiary:** Mike / talent stakeholders evaluating practical product-engineering ability.

The project directly maps to Georgia's graph-generation-for-slides inspiration while showing a broader research-automation workflow.

## 3. Problem

Research and intelligence teams often work from messy source material: PDFs, annual reports, screenshots of tables/charts, copied web tables, analyst notes, CSVs, and financial-services reports. Turning that material into trustworthy slide visuals is slow because an analyst must identify the useful data, manually extract numbers, clean labels, choose the right chart, rebuild it in a consistent style, write a credible caption, and preserve the source/citation trail.

Generic LLM interfaces can summarize a PDF or suggest a chart, but they do not provide a repeatable, source-traceable workflow for document/table extraction, OCR, human review, branded chart rendering, analyst captions, and exportable assets.

The pain is not simply "make me a chart." The pain is:

> Convert messy research evidence into trustworthy, presentation-ready visuals quickly.

## 4. Why Evident Should Care

Evident's public work centers on data, research, benchmarking, and intelligence for AI transformation in financial services. This product maps to likely Evident workflows: AI Index benchmarking, member-facing reports, trackers, public-data research, client/member decks, Banking Brief visuals, and chart-heavy research outputs.

Core value chain:

> source material → extracted data → reviewed dataset → chart recommendation → Evident-style visual → source-backed analyst caption → export.

It removes low-leverage manual extraction and formatting while preserving analyst judgment and evidence quality.

## 5. Product Positioning

This is **not**:

- a generic chart generator;
- a chatbot over PDFs;
- a basic CSV visualizer;
- a deck builder clone.

This is:

> An AI-assisted analyst workflow for turning messy financial-services research material into source-backed, slide-ready charts.

## 6. User Stories

Primary:

> As an Evident analyst, I want to upload a report, screenshot, or table and quickly convert it into a clean chart with extracted data and source-backed commentary, so that I can prepare client/member-ready slides faster without losing evidence traceability.

Secondary:

- As a product/data manager, I want to inspect and correct the extracted dataset before final chart generation, so that I can trust the numbers before they appear in external materials.
- As a research team member, I want chart recommendations and analyst-style captions, so that I can move from raw material to insight faster.
- As a data scientist/engineer, I want extraction results to be structured and validated, so that this workflow could become a repeatable internal automation pipeline.

## 7. Five MVP Versions

Each MVP must be developed, verified, and approved before advancing.

### MVP 1 — Polished Demo + CSV/Paste Flow

Goal: prove the product visually and reliably without depending on OCR.

Must-have:

- Evident-inspired app shell and design system.
- Sample financial-services AI datasets.
- CSV upload.
- Pasted table input.
- Editable extracted table.
- Rules-based chart recommendations.
- At least three chart types.
- PNG chart export.
- CSV data export.

Acceptance:

- A user can open the app locally, pick a sample or upload/paste a table, review the dataset, generate a chart, and export chart/data.
- The first-click demo path is understandable in under 30 seconds.

### MVP 2 — User Document Uploads

Goal: Georgia can upload her own public/non-confidential documents to test the app.

Must-have:

- PDF upload.
- Image/screenshot upload.
- Azure Document Intelligence extraction path.
- Mistral OCR fallback path.
- Candidate table/text extraction display.
- Confidence/error states.
- Human review before charting.

Acceptance:

- A simple PDF report page or screenshot containing a table can produce candidate extracted data.
- Failed/ambiguous extraction is handled honestly with useful guidance.
- The app warns users to upload only public or non-confidential documents for the demo.

### MVP 3 — Source Traceability + Analyst Captions

Goal: make the workflow Evident-grade rather than generic.

Must-have:

- Source filename and page metadata where available.
- Source snippet/notes where available.
- Extraction method shown.
- MiniMax M3 caption generation.
- Caption includes headline, bullets, source note, and caveat.
- Guardrail: captions cannot invent metrics or imply unsupported representativeness.

Acceptance:

- Generated captions distinguish extracted facts, interpretation, and caveats.
- Captions reference only the extracted dataset/source context.

### MVP 4 — Slide/Export Workflow

Goal: directly satisfy the graph-generation-for-slides inspiration.

Must-have:

- One-slide PPTX export if feasible.
- Chart + title + caption + source note on slide.
- Export presets.
- Improved chart theming and polish.

Acceptance:

- User can export a chart package suitable for a slide workflow.
- Output looks intentionally designed, not default-chart-library generated.

### MVP 5 — Production Polish + Deployment Package

Goal: make the project shareable with Georgia/Mike.

Must-have:

- Public Railway deployment.
- README with setup, API env vars, limitations, and demo flow.
- Demo screenshots/GIF if feasible.
- Test fixtures and sample files.
- Final QA checklist.
- Georgia message/demo script.
- Honest privacy/retention note.

Acceptance:

- Deployed public link works without sign-in.
- Demo path works without viewer API keys.
- Tests/build pass.
- Secrets are not committed.

## 8. Non-Goals

The MVP will not:

- perfectly extract every possible PDF layout;
- replace Tableau, Power BI, or Looker;
- build a full presentation editor;
- scrape Evident member-only/private pages;
- clone Evident's proprietary products;
- support enterprise auth/multi-user collaboration;
- support recurring monitoring;
- guarantee extraction accuracy without human review;
- auto-publish charts without user confirmation.

The posture is:

> AI-assisted analyst workflow, with human review before final output.

## 9. Inputs and Data Sources

Supported inputs:

- PDF upload.
- Image/screenshot upload.
- CSV upload.
- Pasted table.
- Built-in demo datasets.

Provider strategy:

- **Azure Document Intelligence:** primary for business-document/table extraction.
- **Mistral OCR:** fallback/secondary document OCR.
- **MiniMax M3:** OpenAI-compatible LLM/multimodal provider for normalization, captions, explanations, and fallback reasoning.

Environment variables:

- `LLM_PROVIDER=openai_compatible`
- `LLM_API_KEY`
- `LLM_BASE_URL=https://api.minimax.io/v1`
- `LLM_MODEL=MiniMax-M3`
- `MISTRAL_API_KEY`
- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`
- `AZURE_DOCUMENT_INTELLIGENCE_KEY`
- `APP_ENV`
- `UPLOAD_RETENTION`

## 10. Core Workflows

### Workflow A — Demo Path

1. User opens app.
2. User selects sample dataset.
3. App shows structured table.
4. User clicks **Recommend Charts**.
5. App recommends 2-3 chart options.
6. User selects chart.
7. App renders Evident-style chart.
8. App generates analyst caption/source note.
9. User exports PNG/CSV/Markdown.

### Workflow B — Upload PDF/Image

1. User uploads PDF or image.
2. System extracts text/tables/numeric candidates.
3. System displays extraction results with confidence/source metadata.
4. User edits/approves extracted data.
5. System recommends charts.
6. User selects chart type.
7. System generates chart and caption.
8. User exports final assets.

### Workflow C — Paste Table / CSV

1. User pastes table or uploads CSV.
2. System parses table directly.
3. User confirms data types and labels.
4. System recommends chart.
5. System generates styled chart and caption.
6. User exports.

## 11. Proposed Architecture

Recommended implementation:

- **Frontend:** Next.js + TypeScript + Tailwind CSS + custom/shadcn-style components.
- **Charts:** ECharts, Recharts, or Plotly; choose based on export quality.
- **Backend:** FastAPI Python backend for document processing, provider integrations, pandas, Pydantic validation.
- **Data:** local/session state for MVP; no user accounts.
- **Deployment:** Railway single app if feasible; otherwise frontend/backend split only if necessary.

Core backend services:

- `ingestion_service`
- `csv_parser_service`
- `document_extraction_service`
- `azure_document_intelligence_provider`
- `mistral_ocr_provider`
- `llm_client`
- `table_normalization_service`
- `chart_recommendation_service`
- `caption_generation_service`
- `export_service`

## 12. Data Model

### ExtractedDataset

```ts
type ExtractedDataset = {
  id: string;
  name: string;
  sourceType: "pdf" | "image" | "csv" | "pasted" | "demo";
  sourceName?: string;
  sourcePage?: number;
  sourceUrl?: string;
  extractionMethod: string;
  confidence?: number;
  columns: DatasetColumn[];
  rows: DatasetRow[];
  notes?: string[];
};
```

### DatasetColumn

```ts
type DatasetColumn = {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "percentage" | "currency" | "unknown";
  unit?: string;
};
```

### DatasetRow

```ts
type DatasetRow = {
  id: string;
  values: Record<string, string | number | null>;
  sourceSnippet?: string;
  confidence?: number;
};
```

### ChartRecommendation

```ts
type ChartRecommendation = {
  chartType: "horizontal_bar" | "vertical_bar" | "grouped_bar" | "line" | "donut" | "heatmap" | "scatter";
  title: string;
  reason: string;
  xKey?: string;
  yKey?: string;
  seriesKey?: string;
  confidence: number;
};
```

### GeneratedCaption

```ts
type GeneratedCaption = {
  headline: string;
  bullets: string[];
  caveat?: string;
  sourceNote?: string;
};
```

## 13. Design System

Use an Evident-inspired visual system, not a copy.

Palette:

- Dark navy: `#0F172A` / `#1A2744`
- Orange accent: `#F97316` / `#FF5F00`
- Soft lavender-gray: `#E6E2ED`
- White/off-white: `#FFFFFF` / `#F8FAFC`
- Muted gray text: `#CBD5E1`

Style:

- Dark premium dashboard shell.
- Rounded cards.
- Pill CTAs.
- Uppercase section labels.
- Thin dividers.
- Clean sans-serif typography.
- Generous whitespace.
- Subtle geometric/particle motif.
- Minimal gridlines and polished labels.
- Embedded source note below chart.

## 14. Acceptance Criteria

Functional:

- [ ] User can open app locally and from deployed public URL by MVP 5.
- [ ] User can select demo data and generate chart.
- [ ] User can upload CSV or paste table and generate chart.
- [ ] User can upload PDF/image and receive extracted candidates by MVP 2.
- [ ] User can review/edit extracted data before chart generation.
- [ ] System recommends at least two chart types when possible.
- [ ] System renders at least three chart types by MVP 1.
- [ ] Charts use Evident-inspired styling.
- [ ] Caption includes source note and caveat by MVP 3.
- [ ] User can export chart as PNG.
- [ ] User can export data as CSV.
- [ ] User can copy/download caption as Markdown.
- [ ] PPTX export exists by MVP 4 if feasible.

Quality:

- [ ] No secrets committed.
- [ ] App handles failed extraction gracefully.
- [ ] Demo/synthetic data is clearly labelled.
- [ ] App does not claim extraction is perfect.
- [ ] App has loading, error, and empty states.
- [ ] App works without viewer sign-in.
- [ ] README explains purpose, setup, APIs, and demo flow.
- [ ] Basic tests cover parser, validation, chart recommendation, and provider error handling.

Visual:

- [ ] UI uses navy/orange/white/lavender palette.
- [ ] Charts look polished enough for a slide.
- [ ] Exported chart includes title/source note.
- [ ] Demo value is understandable in under 30 seconds.

## 15. Verification Plan

Backend:

```bash
pytest
```

Frontend:

```bash
npm run lint
npm run test
npm run build
```

Manual:

1. Select sample financial-services AI dataset.
2. Generate recommendations.
3. Select horizontal bar chart.
4. Generate/export PNG and CSV.
5. Upload simple CSV and repeat.
6. Upload simple PDF/image with a table and verify candidate extraction.
7. Confirm failed extraction has useful error state.
8. Confirm `.env` and secret files are not tracked.

## 16. Demo Script

Opening:

> Georgia mentioned that some Evident work involves automating graph generation for slides, so I built a small studio around that workflow.

Show input:

> The app accepts messy research material: PDFs, screenshots, pasted tables, or CSVs. For the demo, I'll use a financial-services AI dataset, but it can also process uploaded public documents.

Show extraction review:

> Instead of blindly generating a chart, it first creates a structured dataset that the analyst can review and correct.

Show recommendations:

> It recommends chart types based on the data shape and explains why.

Show branded chart:

> Then it renders an Evident-inspired chart style — navy, orange, clean typography, source note — suitable for a report or slide.

Show caption/source:

> It also generates an analyst-style caption with caveats, so the output stays evidence-aware rather than overclaiming.

Show export:

> The chart, dataset, and caption can be exported, so the tool fits into an actual deck workflow rather than staying inside a chatbot.

Close:

> The point wasn't to replace analysts. It was to remove repetitive extraction and formatting work while keeping a human review step.

## 17. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| PDF/table extraction is unreliable across arbitrary documents | Use Azure + Mistral, show confidence, preserve human review, keep sample/CSV paths flawless |
| Scope becomes too broad | Build five sequential MVPs; approve each before advancing |
| Looks like generic chart generator | Emphasize document extraction, source traceability, Evident styling, captions, exports |
| LLM hallucinated captions | Generate from extracted data only; use strict schemas; include caveats |
| API setup delays | Provider abstraction; deterministic demo/CSV path independent |
| Deployment complexity | Railway single-app deployment target |
| Visual quality underwhelms | Build design system early and compare against Evident screenshots |
| Georgia cannot try it quickly | No-login demo mode plus upload path |

## 18. Final Handoff Assets

- Deployed app link.
- GitHub repo.
- README.
- Screenshots/GIF.
- Sample datasets/files.
- Demo script.
- API setup instructions.
- Limitations/privacy note.
- Message draft for Georgia/Mike.

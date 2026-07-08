# Reports to Charts Studio Implementation Plan

> **For Hermes:** Use Claude Code to implement this plan slice-by-slice. User has approved creating local `.env`, spec, and plan. Do not commit secrets. Do not push without explicit user approval.

**Goal:** Build Reports to Charts Studio: a polished web app that turns PDFs, screenshots, CSVs, pasted tables, and research excerpts into Evident-style charts, structured datasets, and source-backed analyst captions.

**Architecture:** Use a Next.js/TypeScript frontend for the polished workspace and chart UI, plus a FastAPI/Python backend for document extraction, provider integrations, validation, and caption generation. Build five sequential MVP versions, verifying each before advancing.

**Tech Stack:** Next.js, TypeScript, Tailwind, ECharts/Recharts/Plotly, FastAPI, Pydantic, pandas, Azure Document Intelligence, Mistral OCR, MiniMax M3 OpenAI-compatible chat completions, Railway deployment.

---

## Non-Negotiables

- Read `AGENTS.md`, `CLAUDE.md`, `docs/spec.md`, and `.claude/rules/evident-project.md` before coding.
- Never commit `.env` or any secret-bearing file.
- Build in small vertical slices.
- Run verification after each slice.
- Prefer polished, reliable demo paths over broad fragile feature spread.
- Keep user-uploaded documents temporary and clearly labelled as public/non-confidential demo uploads.

## Current Repo State

Repo path: `C:\Users\omals\Evident-Project`

Existing docs:

- `AGENTS.md`
- `CLAUDE.md`
- `docs/development-workflow.md`
- `docs/spec-template.md`
- `docs/spec.md`
- `.env` local-only secrets
- `.env.example` safe template

## Environment Variables

Runtime reads from `.env` locally and Railway vars in production:

- `LLM_PROVIDER=openai_compatible`
- `LLM_API_KEY`
- `LLM_BASE_URL=https://api.minimax.io/v1`
- `LLM_MODEL=MiniMax-M3`
- `MISTRAL_API_KEY`
- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`
- `AZURE_DOCUMENT_INTELLIGENCE_KEY`
- `APP_ENV`
- `UPLOAD_RETENTION`

---

## MVP 1 — Polished Demo + CSV/Paste Flow

### Task 1: Scaffold app structure

**Objective:** Create a full-stack project structure suitable for Next.js frontend + FastAPI backend.

**Files:**

- Create: `frontend/package.json`
- Create: `frontend/src/app/page.tsx` or equivalent app entry
- Create: `frontend/src/components/`
- Create: `frontend/src/lib/`
- Create: `backend/pyproject.toml`
- Create: `backend/app/main.py`
- Create: `backend/app/models/`
- Create: `backend/app/services/`
- Create: `backend/tests/`
- Modify: `README.md`

**Steps:**

1. Initialize frontend with TypeScript, Tailwind, and lint/build scripts.
2. Initialize backend with FastAPI, Pydantic, pytest, pandas, python-dotenv, and provider SDK dependencies as needed.
3. Add root README commands for local development.
4. Verify frontend starts and backend health endpoint responds.

**Verification:**

```bash
cd frontend && npm run build
cd ../backend && pytest
```

Expected: frontend build succeeds; backend tests pass or at minimum health test passes.

### Task 2: Build Evident-inspired design system

**Objective:** Implement premium navy/orange/lavender UI shell.

**Files:**

- Create/Modify: `frontend/src/styles/globals.css`
- Create: `frontend/src/components/AppShell.tsx`
- Create: `frontend/src/components/MetricCard.tsx`
- Create: `frontend/src/components/SectionCard.tsx`
- Create: `frontend/src/components/SourceBadge.tsx`

**Steps:**

1. Define color tokens from `docs/spec.md`.
2. Build dark dashboard shell with rounded cards, uppercase labels, pill CTAs.
3. Add subtle background motif.
4. Ensure responsive layout.

**Verification:**

```bash
cd frontend && npm run build
```

Manual: page looks premium and Evident-inspired, not generic Tailwind default.

### Task 3: Add sample datasets

**Objective:** Provide no-upload demo flow.

**Files:**

- Create: `frontend/src/data/sampleDatasets.ts`
- Or backend equivalent: `backend/app/data/sample_datasets.py`

**Steps:**

1. Add 3-5 clearly labelled demo/synthetic financial-services AI datasets.
2. Include metadata: source type, caveat, suggested title, source note.
3. Render sample gallery in UI.

**Verification:**

Manual: selecting sample populates data review table.

### Task 4: Implement CSV and pasted table parsing

**Objective:** Deterministic table input path.

**Files:**

- Create: `backend/app/services/table_parser.py`
- Create: `backend/app/models/dataset.py`
- Create: `backend/tests/test_table_parser.py`
- Create/Modify: frontend upload/paste components

**Steps:**

1. Define Pydantic models matching `docs/spec.md`.
2. Parse CSV and pasted TSV/Markdown-ish tables.
3. Infer column types: string, number, date, percentage, currency, unknown.
4. Return `ExtractedDataset`.
5. Write parser tests before implementation.

**Verification:**

```bash
cd backend && pytest tests/test_table_parser.py -v
```

Expected: tests pass for CSV, pasted table, percentages, currency, blank values.

### Task 5: Editable extraction review table

**Objective:** Let users review and correct extracted data before charting.

**Files:**

- Create: `frontend/src/components/DataReviewTable.tsx`
- Modify: page/workspace state files

**Steps:**

1. Show columns/rows.
2. Allow inline value edits.
3. Allow row deletion.
4. Show source metadata.
5. Preserve updated dataset in app state.

**Verification:**

Manual: edit a value and confirm downstream chart uses updated value.

### Task 6: Chart recommendation engine

**Objective:** Recommend chart types based on data shape.

**Files:**

- Create: `backend/app/services/chart_recommender.py`
- Create: `backend/tests/test_chart_recommender.py`
- Create: `frontend/src/components/ChartRecommendationCard.tsx`

**Steps:**

1. Build rules for horizontal bar, vertical bar, grouped bar, line, donut.
2. Include reason and confidence.
3. Add API endpoint for recommendations.
4. Write tests for common data shapes.

**Verification:**

```bash
cd backend && pytest tests/test_chart_recommender.py -v
```

Expected: sensible recommendations for sample datasets.

### Task 7: Chart rendering and PNG/CSV export

**Objective:** Render polished charts and export assets.

**Files:**

- Create: `frontend/src/components/ChartPreview.tsx`
- Create: `frontend/src/lib/exportChart.ts`
- Create: `frontend/src/lib/exportCsv.ts`

**Steps:**

1. Implement at least horizontal bar, vertical/grouped bar, and line or donut.
2. Apply Evident-inspired styling.
3. Include title and source note.
4. Export PNG.
5. Export CSV.

**Verification:**

Manual: exported chart is usable in a slide and CSV opens correctly.

---

## MVP 2 — User Document Uploads

### Task 8: File upload API and temporary handling

**Objective:** Accept PDF/image uploads safely.

**Files:**

- Create: `backend/app/services/upload_service.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_upload_service.py`
- Create: `frontend/src/components/FileUploadPanel.tsx`

**Steps:**

1. Validate file type and size.
2. Store temporarily only.
3. Return clean error states.
4. Add privacy note in UI.

**Verification:**

```bash
cd backend && pytest tests/test_upload_service.py -v
```

Manual: PDF/image uploads call backend; invalid file is rejected gracefully.

### Task 9: Azure Document Intelligence provider

**Objective:** Use Azure for document/table extraction.

**Files:**

- Create: `backend/app/services/providers/azure_document_intelligence.py`
- Create: `backend/tests/test_azure_provider.py`

**Steps:**

1. Load endpoint/key from env.
2. Use prebuilt layout/document analysis for PDFs/images.
3. Convert tables/text into candidate `ExtractedDataset` objects.
4. Include page/source metadata.
5. Mock provider in tests.

**Verification:**

```bash
cd backend && pytest tests/test_azure_provider.py -v
```

Manual with real key: simple PDF/table screenshot produces candidate data.

### Task 10: Mistral OCR fallback provider

**Objective:** Add fallback OCR extraction.

**Files:**

- Create: `backend/app/services/providers/mistral_ocr.py`
- Create: `backend/tests/test_mistral_provider.py`

**Steps:**

1. Load key from env.
2. Submit PDF/image to Mistral OCR endpoint.
3. Normalize response into candidate text/tables.
4. Use fallback when Azure fails or no table found.
5. Mock provider in tests.

**Verification:**

Provider tests pass; real upload path falls back cleanly.

### Task 11: Candidate extraction review UI

**Objective:** Display extracted candidates and let user choose/edit.

**Files:**

- Create: `frontend/src/components/ExtractionCandidateList.tsx`
- Modify: workspace page

**Steps:**

1. Show candidate tables/text blocks.
2. Include extraction method, confidence, page, source name.
3. User selects candidate and sends to review table.
4. Empty/error states are helpful.

**Verification:**

Manual: uploaded file leads to selectable extraction candidate.

---

## MVP 3 — Source Traceability + Analyst Captions

### Task 12: LLM client for MiniMax M3

**Objective:** Add OpenAI-compatible LLM client.

**Files:**

- Create: `backend/app/services/llm_client.py`
- Create: `backend/tests/test_llm_client.py`

**Steps:**

1. Use env `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`.
2. Implement structured JSON call helper.
3. Add timeout/retry/error handling.
4. Mock tests.

**Verification:**

Tests pass; optional real smoke test returns response from MiniMax.

### Task 13: Caption generation service

**Objective:** Generate analyst-style captions grounded in extracted data.

**Files:**

- Create: `backend/app/services/caption_service.py`
- Create: `backend/tests/test_caption_service.py`
- Create: `frontend/src/components/CaptionPanel.tsx`

**Steps:**

1. Prompt MiniMax with dataset, chart config, source metadata.
2. Enforce JSON schema: headline, bullets, caveat, sourceNote.
3. Add no-overclaiming instructions.
4. Validate response with Pydantic.
5. Provide fallback deterministic caption if LLM fails.

**Verification:**

Tests pass; manual generated caption includes caveat and source note.

### Task 14: Source traceability display

**Objective:** Show evidence context in UI and exports.

**Files:**

- Create/Modify: `frontend/src/components/SourceTracePanel.tsx`
- Modify: chart preview/export logic

**Steps:**

1. Display source filename/page/method.
2. Show snippets where available.
3. Include source note in chart export.
4. Include methodology note in caption panel.

**Verification:**

Manual: source note persists from upload/sample through chart and export.

---

## MVP 4 — Slide/Export Workflow

### Task 15: PPTX export

**Objective:** Export one-slide report asset.

**Files:**

- Create: `backend/app/services/pptx_export_service.py` or frontend equivalent
- Create: `backend/tests/test_pptx_export.py`
- Modify frontend export controls

**Steps:**

1. Generate a slide with title, chart image, caption, source note.
2. Use Evident-style colors.
3. Return downloadable `.pptx`.
4. Add tests that file is created and non-empty.

**Verification:**

Manual: PPTX opens and looks presentable.

### Task 16: Export presets and style controls

**Objective:** Improve slide workflow polish.

**Files:**

- Modify chart components and export UI

**Steps:**

1. Add chart title editor.
2. Add source note editor.
3. Add theme preset if useful.
4. Add aspect ratio presets.

**Verification:**

Manual: user can customize output without breaking exports.

---

## MVP 5 — Production Polish + Deployment Package

### Task 17: README and demo assets

**Objective:** Make project understandable and shareable.

**Files:**

- Modify: `README.md`
- Create: `docs/demo-script.md`
- Create: `docs/limitations-and-privacy.md`
- Add sample files under safe tracked path, e.g. `samples/`

**Steps:**

1. Explain what was built and why Evident should care.
2. Add local setup commands.
3. Add env var instructions.
4. Add demo script.
5. Add privacy/retention limitations.

**Verification:**

Manual: fresh reader can run and demo the app.

### Task 18: Final QA and deployment readiness

**Objective:** Verify clean checkout and Railway readiness.

**Files:**

- Create/Modify deployment config as needed.

**Steps:**

1. Run all tests/builds.
2. Run app locally end-to-end.
3. Check `git status` and secret safety.
4. Verify `.env` untracked.
5. Prepare Railway env var list.

**Verification:**

```bash
git status --short
cd frontend && npm run build
cd ../backend && pytest
```

Expected: no secrets tracked; builds/tests pass.

---

## Claude Code Handoff Pattern

For each slice, Hermes/Raphael will send Claude Code a focused prompt:

```text
Read AGENTS.md, CLAUDE.md, docs/spec.md, and this implementation plan. Implement only [TASK NAME]. Do not commit secrets. Do not broaden scope. Write/adjust tests first where applicable, run verification, then report changed files and command output. Stop after this slice.
```

After Claude completes a slice, Raphael reviews:

1. Spec compliance.
2. Diff quality.
3. Test/build output.
4. UX/product fit.
5. Secret safety.

Proceed only after the slice is good to go.

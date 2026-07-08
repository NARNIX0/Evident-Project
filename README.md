# Evident Project

A shared Hermes + Claude Code workspace for designing and building a high-value Evident Insights demo/project.

## Purpose

This repo is the single source of truth for:

- Ideation and approved project scope
- Product/spec documents
- Implementation plans and task breakdowns
- Application/service source code
- Testing, review, and handoff notes

## Operating Model

- **User + Raphael/Hermes** define the idea, strategy, scope, and acceptance criteria.
- **Raphael/Hermes** acts as orchestrator/architect and maintains project memory.
- **Claude Code Desktop/CLI** acts as implementation agent, using the installed agent-skills lifecycle.
- **Git + this repo** is the shared coordination layer between agents.

## Current Stage

MVP 1 implementation for **Reports to Charts Studio**.

Reports to Charts Studio turns messy research material into slide-ready, Evident-inspired charts with reviewed structured data and exportable assets. MVP 1 focuses on the reliable local demo path: sample datasets, CSV upload, pasted table input, editable extracted data, rules-based chart recommendations, polished chart rendering, PNG export, and CSV export.

## Run MVP 1 Locally

```bash
cd studio
npm install
npm run dev
```

Open the local URL printed by Next.js, usually:

```txt
http://localhost:3000
```

## Verify MVP 1

```bash
cd studio
npm test -- --run
npm run lint
npm run build
```

## MVP 1 Demo Flow

1. Select a built-in financial-services AI sample dataset, upload a CSV, or paste a table.
2. Review and edit extracted data in the table.
3. Generate chart recommendations.
4. Pick a chart type.
5. Export the chart as PNG and the reviewed data as CSV.

MVP 1 is browser-only and does not send data to external services. PDF/image upload, Azure/Mistral OCR, MiniMax captions, PPTX export, and Railway deployment are planned for later MVPs.

## Key Documents

- `AGENTS.md` — rules for all agents working in this repo.
- `CLAUDE.md` — Claude Code project memory and development context.
- `docs/development-workflow.md` — agreed human/Hermes/Claude build loop.
- `docs/spec-template.md` — template for the final project spec.
- `docs/spec.md` — approved Reports to Charts Studio product spec.
- `.hermes/plans/2026-07-07_212742-reports-to-charts-studio-implementation-plan.md` — implementation plan and MVP breakdown.

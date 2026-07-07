# Claude Code Project Memory

## Project

`Evident-Project` is a shared workspace for building a targeted project/demo for Evident Insights.

No final product idea has been approved yet. Do not start implementation until a spec exists in `docs/spec.md` or equivalent and Raphael/Hermes marks it approved.

## Context

Evident Insights works on AI intelligence and benchmarking for financial services. Known relevant areas include data collection, research automation, scraping, LLM-based tooling, graph/chart generation, data analytics, data science, and data engineering.

The user's strengths to showcase:

- Python, SQL, Pandas, data transformation
- Web scraping / data extraction
- NLP and LLM workflows
- Multi-agent systems and verification loops
- Research automation for financial services
- Fast startup-style execution

## Operating Model

- Raphael/Hermes is the architect and orchestrator.
- Claude Code is the implementation engineer.
- This repo is the source of truth.
- Read `AGENTS.md` and `docs/development-workflow.md` before starting work.

## Expected Engineering Workflow

Use the installed agent-skills style of development:

1. Understand the approved spec.
2. Create/confirm implementation plan.
3. Build a thin vertical slice.
4. Add tests or runnable verification.
5. Run relevant commands.
6. Self-review the diff.
7. Commit only coherent, working slices.

## Default Tech Preferences

Final stack depends on the approved spec. Default bias:

- Python-first for data/research/automation workflows.
- Streamlit/FastAPI when a quick demo UI/API is useful.
- SQLite/DuckDB for local analytical storage unless the spec needs otherwise.
- Pandas/Polars depending on workload complexity.
- Pydantic for structured validation.
- Playwright/requests/BeautifulSoup only when scraping is explicitly in-scope and allowed.
- Keep deployment simple unless public hosting is required.

## Commands

No project-specific commands yet. Add them here once a stack is chosen.

Expected future examples:

```bash
# install
uv sync

# run app
uv run streamlit run app.py

# tests
uv run pytest

# lint/format
uv run ruff check . && uv run ruff format --check .
```

## Safety and Scope Rules

- Do not scrape private/authenticated data unless explicitly approved and legal/ethical basis is clear.
- Do not commit API keys, tokens, cookies, or credentials.
- Do not invent Evident internal workflows or data. Use public information and clearly labelled assumptions.
- If a requirement is ambiguous, implement the smallest useful version and document assumptions.
- Ask Raphael/Hermes to resolve major product ambiguity before building.

## Done Definition

A feature is done when:

- It satisfies the relevant acceptance criteria.
- It has been tested or manually verified.
- It is integrated with the rest of the project.
- The README/docs explain how to run or inspect it.
- Known limitations are documented.

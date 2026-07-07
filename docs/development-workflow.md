# Development Workflow

This is the agreed workflow for moving from idea to finished project without the user manually shuttling prompts between tools.

## Phase 1 — Ideation

Participants: User + Raphael/Hermes.

Goal: identify the highest-leverage project to impress or help Evident Insights.

Outputs:

- Candidate ideas
- Decision criteria
- Chosen project direction
- Initial risks and scope boundaries

## Phase 2 — Spec

Owner: Raphael/Hermes.

Raphael drafts a rigorous spec using the project template.

Spec must include:

- Problem
- Target user/stakeholder
- Why this matters to Evident
- Core workflow
- MVP scope
- Non-goals
- Acceptance criteria
- Verification plan
- Demo/handoff plan

The user approves the spec before implementation begins.

## Phase 3 — Task Breakdown

Owner: Raphael/Hermes.

Raphael decomposes the approved spec into ordered slices:

1. Scaffold/base architecture
2. Core data/model/workflow logic
3. UI/API surface
4. Verification/testing
5. Polish/demo docs

Each slice gets acceptance criteria and a Claude Code handoff prompt.

## Phase 4 — Implementation Loop

Owners: Raphael/Hermes + Claude Code.

For each slice:

1. Raphael writes a precise implementation prompt.
2. Claude Code reads repo context and implements the slice.
3. Claude Code runs tests/verification.
4. Claude Code self-reviews and commits coherent changes.
5. Raphael reviews diff and output.
6. Raphael either approves moving on or sends a correction prompt.

The user is not required in the loop unless there is a strategic ambiguity, material scope change, or risky external side effect.

## Phase 5 — Integration and Final QA

Owner: Raphael/Hermes, implemented by Claude Code as needed.

Checklist:

- All acceptance criteria satisfied
- App/service runs from clean checkout
- Tests pass or manual verification is documented
- README is complete
- Demo flow is clear
- Limitations are honest
- Final story is tailored to Georgia/Evident

## Phase 6 — Handoff

Final output includes:

- What was built
- Why it maps to Evident's needs
- How to run it
- Verification evidence
- Suggested message/demo script for Georgia or Mike

## Stop Condition

The autonomous Raphael ⇄ Claude Code loop stops when the approved spec's acceptance criteria are met and final QA passes.

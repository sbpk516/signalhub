# Plan‑First Agent Approval Workflow

This document defines a plan‑first approval style for working with the repo owner. It reduces back‑and‑forth by approving the approach up front, then giving the agent autonomy to implement and validate before the next checkpoint.

## Workflow Overview

1) Proposal (Decision Pack)
- Agent presents: goal, context/problem, options, recommendation, affected areas, risks, validation plan, rollback, and expected effort.
- Owner approves one option (or requests changes). This approval covers the described scope and any routine local actions needed to implement and validate.

2) Implementation Burst (Autonomous)
- Agent implements the approved plan without asking for micro‑approvals.
- Allowed: small focused code/doc changes, local builds, local tests/health checks.
- Agent keeps an internal step‑by‑step plan updated and posts brief progress notes when helpful.

3) Validation and Report‑Back
- Agent validates per plan (targeted tests, /health, manual checks) and summarizes:
  - What was implemented, what worked, what didn’t, and any deviations from plan.
  - Files touched and user‑visible changes.
  - Risks, and how they were mitigated.
  - Next iteration proposal (new Decision Pack if needed).

4) Iterative Approval
- Owner reviews the results and approves the next iteration plan (or requests changes) before the agent proceeds.

5) Final Acknowledgment and Push
- When the agent believes the solution is complete, they ask the owner to confirm it’s working.
- After the owner confirms, the agent pushes changes to the remote repository (typically to `main`, unless otherwise requested).

## Decision Pack Template

- Goal: one‑line objective.
- Context: what’s the issue or feature and why now.
- Options: 2–3 viable approaches with trade‑offs.
- Recommendation: proposed path and rationale.
- Affected areas: files/dirs, components, data.
- Commands: representative commands the agent expects to run.
- Network/Installs: yes/no (list packages/URLs if yes).
- Risks & mitigations: scope, behavior changes, data impact.
- Validation: tests/checks to prove correctness.
- Rollback: how to revert quickly.
- Effort: rough estimate (S/M/L).

## Boundaries and Exceptions

- This workflow does not bypass “high‑risk” approvals. Even with an approved plan, the agent still seeks explicit approval before:
  - Installing packages or using network access.
  - Destructive operations (mass deletes/moves), schema changes/migrations.
  - Code signing, releases, or publishing artifacts.
  - Handling secrets.

## Communication Cadence

- Preambles: short, 1–2 sentence notes before grouped actions.
- Planning: exactly one step marked in‑progress until complete.
- Summaries: outcome, files touched, next actions.

## Push Policy

- Agent only pushes to the remote after the owner confirms the solution works.
- If the owner prefers, the agent can push to a feature branch instead of `main`.

## Quick Example

1) Agent: submits Decision Pack with 2 options; owner approves Option B.
2) Agent: implements Option B, validates, summarizes results.
3) Owner: reviews and approves small follow‑up; agent implements.
4) Owner: confirms it works; agent pushes to `main`.


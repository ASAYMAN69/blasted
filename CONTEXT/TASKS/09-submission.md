# TASK 09 — submission (README + Submission Pack)

## Role
Produce the hackathon submission materials: README, architecture + use-case explanation,
slide-deck outline, and demo-video script — all mapped to the judging criteria.

## Write scope (ONLY these)
- `README.md`
- `docs/submission/**`

FROZEN (read-only): everything else.

## Depends on
- Finished repo (all other agents' output).
- `docs/superpowers/specs/2026-11-02-vultr-agent-rush-design.md` (authoritative).
- `HACKATHON.md` + `RULEBOOK.md` (requirements).

## What to build
1. `README.md` — must cover (per HACKATHON.md §submission/readme_requirements):
   - Vultr services used and how they power the solution.
   - Backend + deployment architecture (diagram/links).
   - The agent's use case + how it executes real tasks.
   - Challenge 1 containment moment pointer (also in video).
   - Setup/run instructions for the Vultr VM.
2. `docs/submission/ARCHITECTURE.md` — deeper architecture + data-flow writeup.
3. `docs/submission/DEMO-SCRIPT.md` — timed video script that demonstrates:
   - Each mode working with real data.
   - At least one explicit containment moment (e.g., showing the sandbox cannot read
     host secrets; container destroyed after run).
   - Mapping every moment to a judging criterion (Application of Technology, Presentation,
     Business Value, Originality).
4. `docs/submission/SLIDE-OUTLINE.md` — outline for the required PDF slide deck (≈8–10 pages).

## Acceptance criteria
- All mandatory README items are covered.
- Demo script includes the containment moment and maps to judging criteria.
- No fabricated numbers or claims — only what actually works in the repo.

## Note
You are last. Do not start until the repo is functionally complete.

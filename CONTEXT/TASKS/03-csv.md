# TASK 03 — csv mode (CSV Analyst)

## Role
Implement the **csv** mode: user uploads CSV + asks a natural-language question; the
agent writes a pandas script; the sandbox runs it; real stats/tables/charts are returned.

## Write scope (ONLY this)
- `backend/app/engine/modes/csv_mode.py`

FROZEN (read-only): `backend/app/engine/modes/base.py`,
`backend/app/engine/modes/__init__.py`, `backend/app/engine/orchestrator.py`,
all of `backend/app/llm/**`, `backend/app/sandbox/**`.

## Depends on
- Frozen `Mode` protocol + `Verification` (CONTRACTS §2).
- The engine calls your methods; you do NOT execute anything yourself.

## What to build
Implement a `CsvMode` class implementing `Mode`:
- `name = "csv"`.
- `input_schema`: `{file: str (uploaded CSV), question: str}`.
- `build_plan_prompt(task)`: ask the model to plan analysis steps for the question.
- `build_code_prompt(task, plan)`: ask for a pandas script reading
  `/workspace/input.csv` and printing a JSON answer + optionally writing chart images to
  `/workspace`.
- `verify(execution)`: PASS if `exit_code == 0` and stdout contains parseable JSON
  (or expected artifact exists); otherwise FAIL with reason.

## Acceptance criteria
- With a sample CSV fixture, `verify` accepts a correct run and rejects a failing one.
- Prompts are deterministic enough to produce runnable pandas code.
- Mode is registered via the frozen `__init__.py` (you do not edit it).

## Note
Keep prompts tight; rely on the engine's retry loop for code fixes.

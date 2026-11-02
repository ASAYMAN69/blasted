# TASK 06 — fix mode (File Fixer — light)

## Role
Implement the **fix** mode: user submits a file + a description of an error/desired
change; the agent edits the file, re-runs it in the sandbox, and returns a diff + green run.

## Write scope (ONLY this)
- `backend/app/engine/modes/fix_mode.py`

FROZEN (read-only): `backend/app/engine/modes/base.py`,
`backend/app/engine/modes/__init__.py`, `backend/app/engine/orchestrator.py`,
all of `backend/app/llm/**`, `backend/app/sandbox/**`.

## Depends on
- Frozen `Mode` protocol + `Verification` (CONTRACTS §2).

## What to build
Implement a `FixMode` class implementing `Mode`:
- `name = "fix"`.
- `input_schema`: `{file: str, error: str | None, desired: str}`.
- `build_plan_prompt(task)`: plan a minimal patch.
- `build_code_prompt(task, plan)`: ask for a script that (1) reads the file, (2) applies
  the fix in a sandbox copy, (3) runs it, (4) writes the diff to `/workspace/fix.diff`.
- `verify(execution)`: PASS if exit 0 AND `fix.diff` exists; else FAIL.

## Acceptance criteria
- Produces a `.diff` artifact and a clean re-run for a sample buggy file.

## Note
This is the light "extensibility" proof — keep it simple and robust.

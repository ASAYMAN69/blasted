# TASK 04 — coder mode (Code Reviewer / Self-Healing Runner)

## Role
Implement the **coder** mode: user submits a Python file (optionally with a failing test
or expected behavior); the agent runs it in the sandbox, diagnoses failures, proposes a
patch, applies it, and re-runs until green.

## Write scope (ONLY this)
- `backend/app/engine/modes/coder_mode.py`

FROZEN (read-only): `backend/app/engine/modes/base.py`,
`backend/app/engine/modes/__init__.py`, `backend/app/engine/orchestrator.py`,
all of `backend/app/llm/**`, `backend/app/sandbox/**`.

## Depends on
- Frozen `Mode` protocol + `Verification` (CONTRACTS §2).

## What to build
Implement a `CoderMode` class implementing `Mode`:
- `name = "coder"`.
- `input_schema`: `{file: str (source), test: str | None, goal: str}`.
- `build_plan_prompt(task)`: plan how to validate the file (run it? run tests?).
- `build_code_prompt(task, plan)`: ask the model to write a wrapper script that runs the
  user's code, captures failures, applies a fix, and re-runs within one sandbox session.
- `verify(execution)`: PASS if exit 0 AND (test ran successfully OR file runs cleanly);
  FAIL otherwise with the captured traceback as reason.

## Acceptance criteria
- A purposely-broken sample file gets fixed to exit 0 within the engine's retry budget.
- `verify` distinguishes "clean run" from "still failing".
- Note in docstring: human approval may be required before destructive edits (future).

## Note
The sandbox never has network; keep fixes to the submitted file only.

# TASK 05 — chart mode (Chart Anything)

## Role
Implement the **chart** mode: user provides CSV/JSON + a chart request; the agent
generates a real plot (matplotlib/plotly) in the sandbox and returns the rendered image.

## Write scope (ONLY this)
- `backend/app/engine/modes/chart_mode.py`

FROZEN (read-only): `backend/app/engine/modes/base.py`,
`backend/app/engine/modes/__init__.py`, `backend/app/engine/orchestrator.py`,
all of `backend/app/llm/**`, `backend/app/sandbox/**`.

## Depends on
- Frozen `Mode` protocol + `Verification` (CONTRACTS §2).

## What to build
Implement a `ChartMode` class implementing `Mode`:
- `name = "chart"`.
- `input_schema`: `{data: str (CSV/JSON), request: str (what to visualize), format: "png" | "html"}`.
- `build_plan_prompt(task)`: plan the chart type and encoding from the request.
- `build_code_prompt(task, plan)`: ask for a script reading
  `/workspace/input.csv`, producing `/workspace/chart.png` (matplotlib) or `chart.html`
  (plotly).
- `verify(execution)`: PASS if exit 0 AND `chart.png`/`chart.html` artifact exists and is
  non-empty; else FAIL.

## Acceptance criteria
- Generates a valid PNG for a sample CSV (e.g., a bar chart).
- `verify` rejects missing/empty chart artifacts.

## Note
Prioritize matplotlib (no browser needed) for the demo; HTML is a bonus.

# 06-flowchart.md — Build Order & Execution Flow

## Part 1: How the multi-step agent works (plain English)

### The core idea

Right now, our app does this: one prompt → one code block → one execution → done.
That's a single step. The new vectors need MULTIPLE steps, where each step's
output feeds into the next step's prompt.

Here's how a multi-step agent works:

```
User submits a task
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Profile the data                                   │
│  - AI writes a pandas script that reads the CSV and reports │
│    column types, nulls, stats, format issues                  │
│  - Script runs in sandbox                                    │
│  - Output: JSON profile report                               │
│  - If exit code != 0: retry (feed error back to AI)         │
└────────────────────────┬────────────────────────────────────┘
                         │ (profile report becomes context)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Write a cleaning script                             │
│  - AI sees: original task + profile report                   │
│  - AI writes a pandas script that cleans the data            │
│  - Script runs in sandbox                                    │
│  - Output: cleaned CSV (artifact) + change log               │
│  - If exit code != 0: retry                                  │
└────────────────────────┬────────────────────────────────────┘
                         │ (cleaned data + change log become context)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Analyze the cleaned data                            │
│  - AI sees: original task + profile + cleaning log + data    │
│  - AI writes a pandas script that computes the answer         │
│  - Script runs in sandbox                                    │
│  - Output: JSON with numbers + insights                      │
│  - If exit code != 0: retry                                  │
└────────────────────────┬────────────────────────────────────┘
                         │ (analysis results become context)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Generate a chart                                    │
│  - AI sees: analysis results + cleaned data                  │
│  - AI writes a matplotlib script that creates a chart        │
│  - Script runs in sandbox                                    │
│  - Output: chart.png (artifact)                              │
│  - If exit code != 0: retry                                  │
└────────────────────────┬────────────────────────────────────┘
                         │ (chart + all previous outputs become context)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Generate a plain-English report                     │
│  - AI sees: everything from steps 1-4                        │
│  - AI writes a text summary (no code, just text)             │
│  - No sandbox needed (LLM text generation only)              │
│  - Output: text (stored in RunResult.summary)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  FINAL RESULT        │
              │  - status: passed    │
              │  - artifacts: [...]  │
              │  - parsed: {...}     │
              │  - summary: "..."    │
              └─────────────────────┘
```

### How context grows

```
Step 1 prompt = task + data preview
Step 2 prompt = task + data preview + Step 1 output
Step 3 prompt = task + data preview + Step 1 output + Step 2 output
Step 4 prompt = task + data preview + Step 1 + Step 2 + Step 3 output
Step 5 prompt = task + data preview + Step 1 + Step 2 + Step 3 + Step 4 output
```

Each step sees everything that happened before. The AI can reference specific
numbers, column names, or errors from previous steps.

### How retries work within a step

```
Attempt 1: AI writes code → sandbox runs it → FAILS (e.g., SyntaxError)
  → Error is captured
  → Prompt is rebuilt with: original task + previous outputs + "Previous error: SyntaxError..."
  → AI tries again

Attempt 2: AI writes NEW code (different approach) → sandbox runs it → SUCCEEDS
  → Step output is captured
  → Move to next step

Attempt 3 (if needed): AI writes code → FAILS again
  → All retries exhausted
  → Pipeline stops, reports failure with the last error
```

### How the AI is told what tools it has

We don't use "function calling" (where the AI picks a tool by name). Instead,
we tell the AI in the prompt text:

```
You are a data analysis agent. You have access to a sandbox where you can
run Python code. The sandbox has pandas, numpy, matplotlib installed.
No network access.

Your task: [task description]

Here is the data: [preview]

Write a Python script that:
1. Reads the CSV from /workspace/input.csv
2. Profiles the data
3. Saves the profile report to /workspace/profile.json

Output ONLY raw Python code.
```

The AI reads this, understands it has a sandbox with pandas, and writes code
accordingly. The "tool" is the sandbox itself — the AI writes code that uses
it, and we run the code.

### How responses are parsed

1. **Code extraction:** Strip markdown fences, extract raw code
2. **Execution:** Run in sandbox, capture stdout/stderr/exit_code/artifacts
3. **Structured output:** Look for marker lines (RESULT_JSON:, CODER_RESULT:,
   FIX_RESULT:) and parse JSON. Fall back to first balanced { } block.
4. **Tolerance:** Accept both strict JSON and Python dict literals
5. **Verification:** Each step has its own rule (exit code, artifacts, fields)

## Part 2: Build order (what to build when)

### Phase 1: Multi-step engine (the core change)
**What:** Extend the Orchestrator to support pipelines (multiple steps per mode)
**Files:** `backend/app/engine/orchestrator.py`, `backend/app/engine/modes/base.py`
**Changes:**
- Add `Pipeline` and `Step` data models
- Add `run_pipeline()` method that executes steps sequentially
- Each step: build prompt → generate code → execute → verify → retry
- Context accumulation: each step's output is passed to the next step
- SSE: yield progress per step (not just per attempt)

### Phase 2: New modes (5 vectors)
**What:** Create 5 new mode files, each implementing the Mode protocol with
multiple steps
**Files:** `backend/app/engine/modes/vector1.py` through `vector5.py`
**Each mode defines:**
- `steps` list (name, prompt builder, verifier, system prompt)
- `build_plan_prompt()` → overall plan for the pipeline
- `build_code_prompt(step_name, plan, context)` → code for a specific step
- `verify(step_name, execution)` → step-specific verification

### Phase 3: Frontend updates
**What:** Update the UI to show multi-step progress
**Files:** `frontend/src/components/TaskForm.jsx`, `TaskProgress.jsx`, `ParsedResult.jsx`
**Changes:**
- TaskForm: mode selector includes new vectors
- TaskProgress: show which step is running (Step 1/5, Step 2/5, etc.)
- ParsedResult: show per-step outputs (profile, cleaning, analysis, chart, report)

### Phase 4: Tests
**What:** Add tests for the new modes and multi-step engine
**Files:** `backend/tests/test_modes_real_sandbox.py` (extend), new test files
**Changes:**
- Unit tests for pipeline logic
- Integration tests for each vector (real sandbox)
- Containment tests (already exist, still pass)

### Phase 5: Deploy + verify
**What:** Push to main, CI runs, CD deploys, verify on VM
**Files:** N/A (git workflow)

## Part 3: What the AI "thinks" (transparency)

### System prompts (what we tell the AI)

For each step, we construct a system message that tells the AI:
1. **Who it is:** "You are a data analysis agent" (not a chatbot)
2. **What it has:** "You have a sandbox with pandas, numpy, matplotlib"
3. **What it must do:** "Write Python code that does X"
4. **What it must NOT do:** "No network, no shell, no file writes outside /workspace"
5. **Output format:** "Output ONLY raw Python code. No markdown, no explanation."

### User prompts (what we give the AI)

For each step, we construct a user message that includes:
1. **The original task** (what the user asked for)
2. **Previous step outputs** (accumulated context)
3. **The specific instruction** for this step
4. **The data preview** (first 20 rows of the CSV)
5. **Any previous errors** (for retries)

### How the AI decides what to do

The AI doesn't "decide" in the human sense. It predicts the most likely next
tokens given the prompt. But the prompt is constructed so that the most likely
response is good code. Here's how:

- We include the data preview → the AI knows what columns exist
- We include the plan → the AI knows what to compute
- We include previous errors → the AI knows what to avoid
- We specify the output format → the AI knows how to structure its response
- We say "Output ONLY raw Python code" → the AI doesn't add explanations

The AI is essentially a very smart autocomplete that, given the right context,
produces the right code. The "thinking" happens in the prompt construction,
not in the AI.

### How tool outputs are fed back

After each sandbox execution, we capture:
- stdout (the script's output)
- stderr (errors/warnings)
- exit_code (0 = success, non-zero = failure)
- artifacts (files created in /workspace)

We append these to the context as text:

```
Step 2 result:
  exit_code: 0
  stdout: "Cleaned 47 rows. Filled 3 nulls in 'age' with median (32.5)."
  stderr: ""
  artifacts: ["cleaned.csv"]
```

This text becomes part of the next step's prompt. The AI sees what happened and
can adjust its approach.

### How retries work

If a step fails:
1. We capture the error (exit code, stderr)
2. We rebuild the prompt with: original task + previous outputs + "Previous error: ..."
3. We ask the AI to try again
4. The AI sees the error and (hopefully) writes different code
5. We run the new code
6. If it succeeds, we move on. If it fails again, we retry (up to 3 times).
7. If all retries fail, the pipeline stops and reports the failure.

The AI doesn't "learn" from retries — it just sees the error and tries again.
Sometimes it fixes the issue, sometimes it doesn't. That's why we bound retries.

## Part 4: What we're NOT building (yet)

- **Multi-agent orchestration** (multiple AI agents working together) — deferred
- **Session persistence** (continuing a task after page refresh) — deferred
- **Browser automation** (Playwright) — deferred (we're doing code execution only)
- **Authentication/authorization** — deferred (single-tenant demo)
- **Rate limiting** — deferred
- **Vultr Serverless Inference integration** — the client is ready, just needs the key

## Part 5: Design rules to follow

The current design uses these rules (from the "high-end-visual-design" and
"industrial-brutalist-ui" skills):

1. **Dark premium** — deep space base (#0a0a0f), aurora glow background
2. **Sharp corners** — no border-radius anywhere (industrial-brutalist direction)
3. **Thin-line icons** — Phosphor/Radix style, 1.5-1.8 stroke width
4. **System-ui typography** — Space Grotesk for display, Plus Jakarta Sans for body
5. **Accent color** — cobalt (#7aa2f7) for primary actions, emerald (#73daca) for success
6. **Framer Motion** — transform/opacity only, custom cubic-bezier(0.23,1,0.32,1)
7. **Reduced motion** — all animations respect prefers-reduced-motion
8. **Hover gating** — @media (hover: hover) and (pointer: fine)
9. **No gradients as decoration** — only for the primary CTA button
10. **No glassmorphism as default** — only on sticky nav elements
11. **No side-stripe borders** — full borders or background tints
12. **No gradient text** — single solid colors
13. **Cards only when truly the best affordance** — prefer flat layouts with borders
14. **Macro-whitespace** — generous padding (py-24 to py-40 for sections)
15. **Eyebrow tags** — microscopic uppercase labels before headings

All new UI must follow these rules. No exceptions.
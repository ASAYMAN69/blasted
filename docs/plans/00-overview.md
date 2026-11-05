# 00-overview.md — AI Architecture & Multi-Step Agent Design

## What we're building

Five multi-step AI agents that solve real business problems. Each agent chains
multiple steps together (profile → clean → analyze → visualize → report), where
each step's output feeds into the next step's prompt. This is NOT a single-shot
tool — it's a pipeline that thinks, executes, verifies, and retries.

## How the AI works (plain English)

### 1. What is an "agent" in this system?

An agent is a loop. It's not magic. Here's what happens:

1. **We give the AI a task** (e.g., "clean this CSV and find the average sales by region")
2. **The AI thinks** (generates a plan in English)
3. **The AI writes code** (Python that does the work)
4. **We run the code** (in a sandbox, safely)
5. **We check if it worked** (exit code 0? right output? right artifacts?)
6. **If it failed, we tell the AI what went wrong** and ask it to try again
7. **If it succeeded, we move to the next step** (or finish)

The AI doesn't "know" anything about your data. It writes code, we run it, and the
code discovers the data. The AI is essentially a very smart code writer that gets
feedback from a real execution environment.

### 2. How the AI "thinks"

The AI (LLM) doesn't think like a human. It's a text prediction engine. When we
say "the AI thinks," what actually happens is:

1. We construct a **prompt** — a big text string containing:
   - A **system message** (who the AI is, what it should do, what rules to follow)
   - A **user message** (the task, the data preview, the plan, previous errors)
2. We send this to the LLM via an HTTP API call (OpenAI-compatible)
3. The LLM generates a response (text) by predicting the most likely next tokens
4. We parse that response and use it

The "thinking" is just: given all this context, what text should come next?

### 3. How tools work

In this system, the AI doesn't call tools directly. Instead:

1. **We define what tools exist** (in the prompt — we tell the AI "you have access
   to a sandbox where you can run Python code")
2. **The AI writes code** that uses those capabilities
3. **We execute the code** in the sandbox
4. **We capture the output** (stdout, stderr, exit code, artifacts)
5. **We feed the output back** to the AI in the next prompt

This is different from "function calling" where the AI decides which function to
call. Here, the AI writes the entire script, and we run it. The AI sees the result
and can adjust.

### 4. How context is managed (multi-step)

For multi-step agents, each step produces output that becomes context for the next
step. Here's how:

```
Step 1: Profile data
  → Input: raw CSV + task description
  → Output: column types, null counts, inconsistencies, a "profile report"

Step 2: Write cleaning script
  → Input: raw CSV + profile report from Step 1
  → Output: a Python script that cleans the data

Step 3: Execute cleaning script
  → Input: the script from Step 2 + the raw CSV
  → Output: cleaned CSV (artifact) + stdout

Step 4: Analyze cleaned data
  → Input: cleaned CSV + original question
  → Output: analysis results (numbers, insights)

Step 5: Generate chart
  → Input: analysis results + cleaned data
  → Output: chart image (artifact)

Step 6: Generate report
  → Input: all previous outputs (profile, cleaning, analysis, chart)
  → Output: plain-English report with numbers and chart reference
```

Each step's prompt includes:
- The original task (what the user asked for)
- The results of ALL previous steps (accumulated context)
- The specific instruction for THIS step

The context grows with each step. By Step 6, the AI has seen the profile, the
cleaning script, the cleaned data, the analysis, and the chart — so it can write
a coherent report that references all of them.

### 5. How tool outputs are appended

In the OpenAI-compatible API format, a conversation looks like this:

```
[
  {"role": "system", "content": "You are a data analyst. Output raw Python code only."},
  {"role": "user", "content": "Here's the task and data..."},
  {"role": "assistant", "content": "Step 1: I will profile the data..."},
  {"role": "user", "content": "Execution result: exit_code=0, stdout=..., stderr=..."},
  {"role": "assistant", "content": "Step 2: Now I'll write a cleaning script..."},
  {"role": "user", "content": "Execution result: exit_code=0, stdout=..., artifacts=[cleaned.csv]"},
  ...
]
```

Each tool execution result is appended as a "user" message (because it's the
environment responding to the AI's code). The AI sees the full history and can
adjust based on what happened.

In our system, we DON'T use multi-turn chat. Instead, we build a single prompt
that includes all previous outputs as text. This is simpler and works well for
single-shot steps. The "context" is just a growing string that gets prepended
to each step's prompt.

### 6. How the AI is told to use tools

We tell the AI through the prompt text itself. For example:

```
You are a data-analysis agent. You have access to a sandbox where you can run
Python code. The sandbox has pandas, numpy, matplotlib installed. No network
access.

Your task: analyze the CSV data and produce a chart.

Here is the CSV data: [preview]

Write a Python script that:
1. Reads the CSV from /workspace/input.csv
2. Computes the average sales by region
3. Saves a bar chart to /workspace/chart.png

Output ONLY raw Python code. No markdown, no explanation.
```

The AI reads this, understands it has a sandbox, and writes code accordingly.
There's no "function calling" API — the AI writes the entire script as text,
and we extract it and run it.

### 7. How responses are parsed

The AI's response is raw text. We parse it in several ways:

1. **Code extraction:** Strip markdown fences (```python ... ```), extract the
   raw code inside. If no fences, use the whole response.
2. **Structured output:** Look for a marker line like `RESULT_JSON: {...}` and
   parse the JSON. Fall back to finding the first balanced `{...}` block.
3. **Verdict parsing:** For code review/fix modes, look for `CODER_RESULT: {...}`
   or `FIX_RESULT: {...}` markers and parse the verdict.
4. **Tolerance:** Accept both strict JSON and Python dict literals (using
   `ast.literal_eval` as a fallback).

### 8. OpenAI-compatible API format

The LLM is called via HTTP POST to an OpenAI-compatible endpoint:

```
POST https://api.vultrinference.com/v1/chat/completions
Headers: Authorization: Bearer <key>, Content-Type: application/json
Body: {
  "model": "mimo-v2.6-flash",
  "messages": [
    {"role": "system", "content": "You are a code generator..."},
    {"role": "user", "content": "Write a script that..."}
  ],
  "max_tokens": 1024
}
Response: {
  "choices": [{"message": {"content": "import pandas...", "role": "assistant"}}]
}
```

We use the `openai` Python SDK, which handles the HTTP for us. The `system`
parameter becomes a `{"role": "system", ...}` message. Some models (glm, deepseek)
put their answer in a `reasoning` field instead of `content` — we handle that
fallback.

### 9. Multi-step loop design

Each vector is a **pipeline** of steps. Each step:
1. Has a **prompt builder** (constructs the prompt from accumulated context)
2. Has a **verifier** (checks if the step succeeded)
3. Produces **output** (text, artifacts, structured data) that feeds into the next step
4. Has a **retry budget** (bounded, default 3 attempts)

The pipeline stops on the first un-recoverable failure, or completes all steps.

```
Pipeline = [Step1, Step2, Step3, ..., StepN]
Context = {}  # accumulates outputs from each step

for step in Pipeline:
    for attempt in range(max_retries):
        prompt = step.build_prompt(task, Context)
        code = llm.generate(prompt, system=step.system_prompt)
        result = sandbox.execute(code, files)
        verification = step.verify(result)
        if verification.ok:
            Context[step.name] = result  # feed forward
            break
        else:
            Context[f"{step.name}_error"] = verification.reason  # feed error back
    else:
        # all retries exhausted
        return failure
return success  # all steps passed
```

### 10. What makes this different from a single-shot tool

- **Single-shot (current modes):** one prompt → one code block → one execution → done
- **Multi-step (new vectors):** step 1 produces output → step 2 uses that output →
  step 3 uses step 2's output → ... each step is a real execution with real feedback
- The AI "thinks" across steps: it sees what happened in step 1 when writing code
  for step 2, and can adjust its approach
- Failures are isolated to a single step (not the whole task)
- The final deliverable (report, chart, cleaned data) is richer because it's built
  from multiple real executions

### 11. Why this provides real value

Each vector solves a problem that takes a human 1-4 hours manually:
- Data profiling + cleaning + analysis (Vector 1, 6)
- Code testing + fixing (Vector 2)
- Document extraction + reconciliation (Vector 3)
- Research synthesis (Vector 4)
- Anomaly detection + root cause (Vector 5)
- Database migration testing (Vector 7)
- Cross-system reconciliation (Vector 8)

The agent does it in minutes, with verifiable output, in a safe sandbox. That's
the business value judges score on.
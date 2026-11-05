# Vector 5: Data → Anomaly → Root Cause → Fix → Verify (DevOps)

## The problem

A monitoring dashboard shows a spike in error rates at 3am. The on-call engineer
wakes up, opens 5 different tools (Grafana, Datadog, CloudWatch, GitHub, Slack),
and spends 2 hours figuring out: what happened, why, and how to fix it. By the
time they find the root cause, the incident has escalated. This is the #1 pain
point for SRE/DevOps teams.

## What the agent does (multi-step pipeline)

### Step 1: Load and profile the metrics
- **Input:** User uploads a time-series CSV (metrics over time: timestamp, error_rate,
  latency, cpu, memory, etc.) + optionally a second CSV of events (deploys, config
  changes, alerts)
- **AI does:** writes a pandas script that:
  - Loads both CSVs
  - Reports column types, row counts, time range
  - Computes basic stats (mean, std, min, max) for each metric
  - Identifies the metric with the highest variance (most likely to have anomalies)
- **Runs in sandbox:** yes (pandas)
- **Output:** JSON profile report
- **Verification:** exit code 0 + valid JSON with "metrics", "stats", "time_range" fields
- **If fails:** retry

### Step 2: Detect anomalies
- **Input:** metrics CSV + profile from Step 1
- **AI does:** writes a Python script that:
  - Uses statistical methods (z-score, IQR, rolling mean ± 2σ) to detect anomalies
  - Identifies: which metric, when, how severe (z-score), direction (spike/drop)
  - Outputs a JSON array of anomalies: {metric, timestamp, value, expected, severity}
- **Runs in sandbox:** yes (pandas, numpy, scipy)
- **Output:** JSON array of anomalies
- **Verification:** exit code 0 + valid JSON + at least 1 anomaly detected
- **If fails:** retry with the detection error

### Step 3: Correlate with events
- **Input:** anomalies (Step 2) + events CSV (deploys, config changes)
- **AI does:** writes a Python script that:
  - For each anomaly, finds events within ±30 minutes
  - Computes correlation strength (time proximity, metric-event relationship)
  - Outputs: {anomaly, correlated_events: [...], correlation_score: float}
- **Runs in sandbox:** yes (pandas, datetime)
- **Output:** JSON with anomaly-event correlations
- **Verification:** exit code 0 + valid JSON + each anomaly has a correlation entry
- **If fails:** retry

### Step 4: Hypothesize root cause
- **Input:** anomaly-event correlations (Step 3) + all previous outputs
- **AI does:** writes a Python script that:
  - Ranks hypotheses by correlation strength
  - Generates a root-cause hypothesis: "The error spike at 03:15 was likely caused by
    deploy #42 at 03:02, which changed the database connection pool size"
  - Outputs: {hypothesis: str, confidence: float, evidence: [...], recommended_action: str}
- **Runs in sandbox:** no (LLM reasoning + text generation)
- **Output:** JSON with hypothesis, confidence, evidence, recommended action
- **Verification:** non-empty hypothesis + confidence between 0 and 1

### Step 5: Verify the fix
- **Input:** hypothesis + recommended action + original metrics
- **AI does:** writes a Python script that:
  - Simulates the fix (e.g., "if we revert the connection pool change, what would
    the error rate look like?") — this is a what-if analysis
  - Computes: projected error rate after fix, expected recovery time
  - Generates a chart: actual (with anomaly) vs projected (after fix)
- **Runs in sandbox:** yes (pandas, numpy, matplotlib)
- **Output:** chart.png + JSON with projected metrics
- **Verification:** exit code 0 + chart.png exists + JSON with "projected" field

### Step 6: Generate incident report
- **Input:** all previous outputs (profile, anomalies, correlations, hypothesis, fix verification)
- **AI does:** writes a 5-8 paragraph incident report:
  - Summary: what happened, when, how severe
  - Root cause: what caused it, with evidence
  - Impact: how many users affected, duration
  - Fix: what was done / what should be done
  - Prevention: how to prevent recurrence
  - Timeline: minute-by-minute of the incident
- **Runs in sandbox:** no (LLM text generation)
- **Output:** text (stored in RunResult.summary)
- **Verification:** non-empty + contains at least 2 numbers + mentions a timestamp

## Tools the agent has

| Tool | What it does | How it works |
|---|---|---|
| `profile_metrics` | Loads metrics CSV, reports stats, finds highest-variance metric | AI writes pandas script → sandbox runs it |
| `detect_anomalies` | Statistical anomaly detection (z-score, IQR, rolling mean) | AI writes pandas+numpy+scipy script → sandbox runs it |
| `correlate_events` | Matches anomalies to nearby events (deploys, config changes) | AI writes pandas datetime-matching script → sandbox runs it |
| `hypothesize` | Ranks root-cause hypotheses by correlation strength | AI reasons over the data (no sandbox) |
| `verify_fix` | What-if analysis: projects error rate after the proposed fix | AI writes pandas+matplotlib script → sandbox runs it |
| `generate_report` | Writes a full incident report | AI generates text directly (no sandbox) |

## How the AI "thinks" across steps

Step 2 is the core: the AI has to pick the right anomaly detection method. Z-score
works for normal distributions but fails for seasonal data. IQR is robust but
misses gradual drifts. Rolling mean ± 2σ catches spikes but not slow trends. The
AI sees the profile from Step 1 and picks the right method.

Step 4 is where the AI's reasoning shines: it has anomaly data, correlated events,
and has to form a hypothesis. "Deploy #42 changed the DB pool size at 03:02, and
the error spike started at 03:15" → high correlation → likely root cause. The AI
weights multiple signals and produces a confidence score.

Step 5 is the "prove it" step: the AI doesn't just propose a fix, it simulates
what would happen if the fix were applied. This is what makes the report actionable
— the engineer can see "if we revert, error rate drops to 0.5%."

## Verification strategy

Each step has a different verification rule:
- Step 1: exit 0 + valid JSON with "metrics", "stats", "time_range"
- Step 2: exit 0 + valid JSON + at least 1 anomaly
- Step 3: exit 0 + valid JSON + each anomaly has correlation entry
- Step 4: non-empty hypothesis + confidence in [0,1]
- Step 5: exit 0 + chart.png exists + JSON with "projected" field
- Step 6: non-empty text + at least 2 numbers + mentions a timestamp

## Value proposition

- **Time saved:** 2 hours of manual incident investigation → 5 minutes
- **Accuracy:** Real statistical analysis, not LLM guessing
- **Actionability:** Not just "what happened" but "here's the likely cause and
  here's what happens if you fix it"
- **Safety:** Runs in a sandbox, can't touch production monitoring
- **Auditability:** Every step's code, output, and reasoning is visible

## Why this fits the hackathon

- Multi-step agentic workflow (6 steps, each with retry) — the most steps of any vector
- Actual execution (pandas, numpy, scipy, matplotlib in real Docker containers)
- Verifiable results (exit codes, artifacts, structured JSON)
- Business value (SRE/DevOps teams live this pain weekly)
- Containment moment (show the sandbox can't access production systems)
- Uses Vultr VM + Vultr Serverless Inference (required)
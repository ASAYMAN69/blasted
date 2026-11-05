# Vector 1: Messy Data → Decision (Business Analytics)

## The problem

A finance/ops team gets a CSV of transactions every week. The data is messy:
dates in 3 different formats, currencies mixed, missing values, inconsistent
column names. Before they can answer "what's our burn rate?", someone spends 2
hours cleaning it in Excel. Then they ask the question. Then they make a chart.
Then they write a summary for the boss. That's 2-3 hours of manual work for a
question that should take 30 seconds.

## What the agent does (multi-step pipeline)

### Step 1: Profile the data
- **Input:** raw CSV (user uploads)
- **AI does:** writes a pandas script that reads the CSV and reports:
  - column names and types (what pandas guessed)
  - null counts per column
  - sample values (first 5 + last 5)
  - detected format issues (e.g., "date column has 3 formats: YYYY-MM-DD, DD/MM/YYYY, MM-DD-YYYY")
  - basic stats (min, max, mean for numeric columns)
- **Runs in sandbox:** yes (pandas)
- **Output:** a JSON profile report (structured data)
- **Verification:** exit code 0 + valid JSON with required fields
- **If fails:** retry (the AI gets the error and tries a different approach)

### Step 2: Write a cleaning script
- **Input:** raw CSV + profile report from Step 1
- **AI does:** writes a pandas script that:
  - Standardizes dates to YYYY-MM-DD
  - Normalizes currencies (converts all to USD, or flags mixed currencies)
  - Fills nulls (mean for numeric, "unknown" for categorical, or drops rows)
  - Renames columns to consistent snake_case
  - Saves the cleaned CSV to /workspace/cleaned.csv
- **Runs in sandbox:** yes (pandas)
- **Output:** cleaned CSV (artifact) + stdout summary
- **Verification:** exit code 0 + cleaned.csv exists + no nulls in key columns
- **If fails:** retry with the error

### Step 3: Analyze the cleaned data
- **Input:** cleaned CSV + user's original question (e.g., "what's our burn rate?")
- **AI does:** writes a pandas script that:
  - Computes the specific metric the user asked for
  - Detects anomalies (spikes, drops, outliers)
  - Computes trends (month-over-month, week-over-week)
  - Returns numbers in a structured JSON format
- **Runs in sandbox:** yes (pandas)
- **Output:** JSON with numbers + insights
- **Verification:** exit code 0 + valid JSON with "numbers" and "summary" fields
- **If fails:** retry with the error

### Step 4: Generate a chart
- **Input:** analysis results + cleaned data
- **AI does:** writes a matplotlib script that:
  - Creates a chart matching the analysis (bar for categories, line for trends, etc.)
  - Uses the user's chosen color palette (or default)
  - Saves to /workspace/chart.png
- **Runs in sandbox:** yes (matplotlib)
- **Output:** chart.png (artifact)
- **Verification:** exit code 0 + chart.png exists + non-empty
- **If fails:** retry

### Step 5: Generate a plain-English report
- **Input:** all previous outputs (profile, cleaning, analysis, chart)
- **AI does:** writes a report (no code, just text) that:
  - Summarizes what was found in 2-3 sentences
  - Lists key numbers (burn rate, trend, anomalies)
  - References the chart
  - Flags any data quality issues found during cleaning
- **Runs in sandbox:** no (just LLM text generation)
- **Output:** text (stored in RunResult.summary)
- **Verification:** non-empty, contains at least one number

## Tools the agent has

| Tool | What it does | How it works |
|---|---|---|
| `profile_data` | Reads CSV, reports column types, nulls, formats, stats | AI writes pandas script → sandbox runs it → stdout captured |
| `clean_data` | Standardizes dates, normalizes currencies, fills nulls, renames columns | AI writes pandas script → sandbox runs it → cleaned.csv artifact |
| `analyze_data` | Computes the specific metric, detects anomalies, trends | AI writes pandas script → sandbox runs it → JSON output |
| `generate_chart` | Creates a matplotlib chart from the analysis | AI writes matplotlib script → sandbox runs it → chart.png artifact |
| `generate_report` | Writes a plain-English summary | AI generates text directly (no sandbox) |

## How the AI "thinks" across steps

Each step's prompt includes ALL previous outputs:

```
Step 3 prompt includes:
  - Original task: "what's our burn rate?"
  - Step 1 output: "Columns: date (mixed formats), amount (USD, no nulls), category (3 nulls)"
  - Step 2 output: "Cleaned 47 rows. Standardized dates. Filled 3 null categories with 'unknown'."
  - Step 3 instruction: "Compute monthly burn rate from cleaned.csv. Detect anomalies."
```

The AI sees the full history and can adjust its approach. If Step 1 found that dates were in 3 formats, the AI in Step 2 knows to handle all 3. If Step 2 cleaned 47 rows, Step 3 knows the data size.

## Verification strategy

Each step has a different verification rule:
- Step 1: exit 0 + valid JSON with "columns", "nulls", "stats" fields
- Step 2: exit 0 + cleaned.csv exists + no nulls in key columns
- Step 3: exit 0 + valid JSON with "numbers" and "summary" fields
- Step 4: exit 0 + chart.png exists + non-empty
- Step 5: non-empty text + contains at least one number

If a step fails, the error is fed back to the AI and it retries (up to 3 attempts). If all retries fail, the pipeline stops and reports the failure.

## What makes this different from a single-shot tool

A single-shot tool asks the AI to "analyze this CSV and make a chart" in one prompt. The AI has to guess everything at once — what columns exist, what format they're in, what cleaning is needed, what chart to make. It often fails because it doesn't know the data.

This multi-step approach:
1. First discovers the data (Step 1)
2. Then cleans it based on what was discovered (Step 2)
3. Then analyzes based on what was cleaned (Step 3)
4. Then visualizes based on what was analyzed (Step 4)
5. Then reports based on everything (Step 5)

Each step is a real execution with real feedback. The AI "thinks" across steps because it sees previous results. This is what makes it reliable.

## Value proposition

- **Time saved:** 2-3 hours of manual Excel work → 30 seconds
- **Accuracy:** Real code runs, not LLM hallucination
- **Auditability:** Every step's code and output is visible
- **Safety:** Runs in a sandbox, can't touch production data
- **Reusability:** The cleaning script can be saved and re-run on next week's data

## Why this fits the hackathon

- Multi-step agentic workflow (5 steps, each with retry)
- Actual execution (pandas, matplotlib run in real Docker containers)
- Verifiable results (exit codes, artifacts, structured JSON)
- Business value (finance/ops teams do this weekly)
- Containment moment (show the sandbox can't access host files)
- Uses Vultr VM + Vultr Serverless Inference (required)
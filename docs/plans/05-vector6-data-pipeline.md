# Vector 6: Raw → Clean → Analyze → Visualize → Narrate (Data Science)

## The problem

A data scientist gets a messy dataset from a client. 80% of their time goes to
cleaning: fixing nulls, standardizing formats, removing outliers, handling
inconsistent types. Only 20% goes to actual analysis. The client wants insights,
not code. The data scientist spends 4 hours cleaning and 1 hour analyzing — and
the client doesn't care about the cleaning, they just want the answer.

## What the agent does (multi-step pipeline)

### Step 1: Profile the data
- **Input:** User uploads raw data (CSV or JSON, possibly multiple files)
- **AI does:** writes a pandas script that:
  - Reports: shape, column names, dtypes (what pandas guessed)
  - Null counts per column (absolute + percentage)
  - Unique value counts (for categorical columns)
  - Basic stats (min, max, mean, median, std for numeric columns)
  - Detected issues: "column 'age' has 3 nulls", "column 'date' has 4 formats",
    "column 'salary' is stored as string but looks numeric"
  - Outputs a structured JSON profile report
- **Runs in sandbox:** yes (pandas)
- **Output:** JSON profile report
- **Verification:** exit code 0 + valid JSON with "shape", "columns", "nulls", "stats"
- **If fails:** retry

### Step 2: Write a cleaning script
- **Input:** profile report (Step 1) + raw data
- **AI does:** writes a pandas script that:
  - Handles nulls: mean/median for numeric, mode or "unknown" for categorical,
    or drops rows if >50% null
  - Fixes types: converts string numbers to numeric, parses dates, standardizes
    categories (e.g., "yes"/"Yes"/"YES" → "yes")
  - Removes outliers: IQR-based or z-score-based (configurable)
  - Standardizes column names (snake_case, no spaces)
  - Saves cleaned data to /workspace/cleaned.csv
  - Reports what was changed: "Filled 3 nulls in 'age' with median (32.5). Converted
    'salary' from string to int64. Removed 2 outliers from 'revenue' (>3σ)."
- **Runs in sandbox:** yes (pandas, numpy)
- **Output:** cleaned.csv (artifact) + change log (stdout)
- **Verification:** exit code 0 + cleaned.csv exists + fewer nulls than original
- **If fails:** retry with the cleaning error

### Step 3: Analyze the cleaned data
- **Input:** cleaned CSV (Step 2) + user's original question (if any)
- **AI does:** writes a pandas script that:
  - If user asked a specific question: answers it (e.g., "what's the correlation
    between age and salary?")
  - If no specific question: runs a standard EDA (exploratory data analysis):
    - Correlation matrix (numeric columns)
    - Top categories (categorical columns)
    - Distribution summary (mean, median, skew, kurtosis)
    - Segment analysis (group by categorical, aggregate numeric)
  - Outputs structured JSON with findings
- **Runs in sandbox:** yes (pandas, numpy, scipy)
- **Output:** JSON with findings
- **Verification:** exit code 0 + valid JSON with "findings" or "answer" field
- **If fails:** retry

### Step 4: Generate charts
- **Input:** analysis results (Step 3) + cleaned data
- **AI does:** writes a matplotlib script that:
  - Creates 2-3 charts based on the analysis:
    - Correlation heatmap (if multiple numeric columns)
    - Bar chart (if categorical breakdown)
    - Line chart (if time series)
    - Histogram (if distribution analysis)
  - Uses the user's chosen color palette (or default)
  - Saves each to /workspace/chart1.png, chart2.png, etc.
- **Runs in sandbox:** yes (matplotlib, seaborn if available)
- **Output:** chart1.png, chart2.png, chart3.png (artifacts)
- **Verification:** exit code 0 + at least 1 chart artifact exists
- **If fails:** retry

### Step 5: Generate insights report
- **Input:** all previous outputs (profile, cleaning log, analysis, charts)
- **AI does:** writes a 5-8 paragraph insights report:
  - "Here's what I found in your data..."
  - Key findings (3-5 bullet points with numbers)
  - Data quality notes (what was cleaned, what was dropped)
  - Recommendations (what to investigate next)
  - References to the charts
- **Runs in sandbox:** no (LLM text generation)
- **Output:** text (stored in RunResult.summary)
- **Verification:** non-empty + contains at least 3 numbers + references at least 1 chart

## Tools the agent has

| Tool | What it does | How it works |
|---|---|---|
| `profile_data` | Loads data, reports shape, types, nulls, stats, issues | AI writes pandas script → sandbox runs it |
| `clean_data` | Handles nulls, fixes types, removes outliers, standardizes | AI writes pandas+numpy script → sandbox runs it |
| `analyze_data` | Runs EDA or answers a specific question | AI writes pandas+scipy script → sandbox runs it |
| `generate_charts` | Creates 2-3 charts based on analysis | AI writes matplotlib script → sandbox runs it |
| `generate_insights` | Writes a plain-English insights report | AI generates text directly (no sandbox) |

## How the AI "thinks" across steps

Step 1 is the foundation: the AI discovers the data's problems. Step 2 uses those
problems to write targeted cleaning code. If Step 1 found "column 'date' has 4
formats," Step 2 writes code to handle all 4. If Step 1 found "column 'salary' is
stored as string but looks numeric," Step 2 converts it.

Step 3 is where the AI's reasoning matters: if the user asked a specific question,
the AI answers it. If not, the AI runs a standard EDA. The AI sees the cleaned
data's profile (from Step 2) and decides which analyses are most informative.

Step 4 is where the AI picks the right chart types. If the data has a time column,
the AI makes a line chart. If it has categories, a bar chart. If it has two
numeric columns, a scatter plot. The AI sees the analysis results and picks
appropriate visualizations.

Step 5 ties everything together: the AI has seen the raw data profile, the cleaning
log, the analysis results, and the charts. It can write a coherent insight report
that references specific numbers and charts.

## Verification strategy

Each step has a different verification rule:
- Step 1: exit 0 + valid JSON with "shape", "columns", "nulls", "stats"
- Step 2: exit 0 + cleaned.csv exists + fewer nulls than original
- Step 3: exit 0 + valid JSON with "findings" or "answer" field
- Step 4: exit 0 + at least 1 chart artifact exists
- Step 5: non-empty text + at least 3 numbers + references at least 1 chart

## Value proposition

- **Time saved:** 4 hours of manual data cleaning + analysis → 5 minutes
- **Accuracy:** Real code profiles, cleans, and analyzes — not LLM guessing
- **Transparency:** Every step's code, output, and cleaning log is visible
- **Safety:** Runs in a sandbox, can't touch production data
- **Reusability:** The cleaning script can be saved and re-run on next month's data
- **Insights:** Not just "here's the data" but "here's what it means"

## Why this fits the hackathon

- Multi-step agentic workflow (5 steps, each with retry)
- Actual execution (pandas, numpy, scipy, matplotlib in real Docker containers)
- Verifiable results (exit codes, artifacts, structured JSON)
- Business value (data scientists spend 80% of their time cleaning data)
- Containment moment (show the sandbox can't access the host's files)
- Uses Vultr VM + Vultr Serverless Inference (required)
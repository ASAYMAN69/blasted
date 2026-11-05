# Vector 4: Research → Cross-Reference → Cite → Report (Knowledge Work)

## The problem

You need to research a topic. You find 5 sources (articles, papers, reports). They
contradict each other. You spend 3 hours reading, cross-referencing, and writing a
report with citations. The report needs to be accurate, cite sources, and flag
contradictions. This is what analysts, consultants, and researchers do daily.

## What the agent does (multi-step pipeline)

### Step 1: Fetch all sources
- **Input:** User provides 3-5 URLs (or pastes text from sources)
- **AI does:** writes a Python script that uses `requests` + `BeautifulSoup` to
  fetch each URL, extracts the main text content (strips HTML, nav, ads)
- **Runs in sandbox:** yes (requests, BeautifulSoup4, lxml)
- **Output:** raw text from each source (stored in context as a dict: url → text)
- **Verification:** exit code 0 + non-empty text from at least 2 sources
- **If fails:** retry (maybe the site blocks requests — try with a User-Agent header)

### Step 2: Extract key claims from each source
- **Input:** raw text from Step 1
- **AI does:** writes a Python script that:
  - Splits text into sentences
  - Uses regex/heuristics to extract: statistics, dates, named entities, quotes
  - Outputs a JSON array of claims per source: {source_url, claims: [...]}
- **Runs in sandbox:** yes (re, json, nltk if available)
- **Output:** JSON array of claims per source
- **Verification:** exit code 0 + valid JSON + at least 3 claims per source
- **If fails:** retry with the extraction error

### Step 3: Cross-reference claims
- **Input:** claims from Step 2
- **AI does:** writes a Python script that:
  - Compares claims across sources (string similarity, number matching)
  - Identifies: agreements (2+ sources say the same thing), contradictions
    (sources disagree on a fact), unique claims (only one source mentions it)
  - Outputs a JSON object: {agreements: [...], contradictions: [...], unique: [...]}
- **Runs in sandbox:** yes (difflib, fuzzywuzzy, json)
- **Output:** JSON with agreements, contradictions, unique claims
- **Verification:** exit code 0 + valid JSON with all three arrays present
- **If fails:** retry

### Step 4: Generate a research report
- **Input:** cross-reference results (Step 3) + all source texts
- **AI does:** writes a script that:
  - Creates a summary table: claim | sources | agreement level
  - Generates a bar chart: number of claims by agreement level (agree/contradict/unique)
  - Outputs a structured report (JSON) with sections: summary, agreements,
    contradictions, unique claims, confidence score
- **Runs in sandbox:** yes (pandas, matplotlib)
- **Output:** report.json + chart.png (artifacts)
- **Verification:** exit code 0 + both artifacts exist

### Step 5: Generate plain-English report with citations
- **Input:** all previous outputs
- **AI does:** writes a 5-8 paragraph report that:
  - Summarizes the topic in 2-3 sentences
  - Lists key findings with source citations [1], [2], etc.
  - Highlights contradictions and how to resolve them
  - Gives a confidence score (high/medium/low) based on source agreement
  - Lists the sources with URLs
- **Runs in sandbox:** no (LLM text generation)
- **Output:** text (stored in RunResult.summary)
- **Verification:** non-empty, contains at least 2 citations, contains at least one number

## Tools the agent has

| Tool | What it does | How it works |
|---|---|---|
| `fetch_sources` | Downloads web pages, extracts text | AI writes requests+BeautifulSoup script → sandbox runs it |
| `extract_claims` | Pulls statistics, dates, entities, quotes from text | AI writes regex/heuristic script → sandbox runs it |
| `cross_reference` | Compares claims across sources, finds agreements/contradictions | AI writes difflib/fuzzy matching script → sandbox runs it |
| `generate_report` | Creates summary table + chart + structured report | AI writes pandas + matplotlib script → sandbox runs it |
| `summarize` | Writes a cited research report | AI generates text directly (no sandbox) |

## How the AI "thinks" across steps

Step 2 is the key challenge: the AI has to extract meaningful claims from raw
text. It can't just take every sentence — it needs to find the important facts.
The AI sees the raw text and writes extraction logic. If it extracts too much
noise, Step 3 will have too many false matches. If it extracts too little, the
report will be thin.

Step 3 is where the real value is: the AI has to compare claims across sources
semantically. "Revenue grew 20%" and "Sales increased by one-fifth" mean the same
thing — the AI needs to catch that. This requires fuzzy matching + number
normalization, which is real code.

## Verification strategy

Each step has a different verification rule:
- Step 1: exit 0 + non-empty text from at least 2 sources
- Step 2: exit 0 + valid JSON + at least 3 claims per source
- Step 3: exit 0 + valid JSON with "agreements", "contradictions", "unique" arrays
- Step 4: exit 0 + report.json exists + chart.png exists
- Step 5: non-empty text + at least 2 citations + at least one number

## Value proposition

- **Time saved:** 3 hours of manual research synthesis → 5 minutes
- **Accuracy:** Real code extracts and cross-references, not LLM guessing
- **Trust:** Every claim is cited with a source URL
- **Safety:** Runs in a sandbox, can't access private data
- **Reusability:** The extraction script can be saved and re-run on new sources

## Why this fits the hackathon

- Multi-step agentic workflow (5 steps, each with retry)
- Actual execution (requests, BeautifulSoup, difflib, pandas, matplotlib)
- Verifiable results (exit codes, artifacts, structured JSON)
- Business value (analysts, consultants, researchers do this daily)
- Containment moment (show the sandbox can't access the host's network/files)
- Uses Vultr VM + Vultr Serverless Inference (required)
# Vector 3: Document → Extract → Reconcile → Report (Legal/Finance)

## The problem

A company receives 10-50 invoices from vendors every month. Each invoice has a
different format (PDF, image, email). Someone manually reads each one, enters the
data into an accounting system, and checks it against purchase orders. Mistakes
cost money. This takes 4-8 hours per month for a small company, days for a large one.

## What the agent does (multi-step pipeline)

### Step 1: Extract text from each document
- **Input:** User uploads 3-10 invoice files (PDF or text)
- **AI does:** writes a Python script that uses pdfplumber (for PDFs) or reads text
  files directly, extracts all text from each document
- **Runs in sandbox:** yes (pdfplumber, PyPDF2)
- **Output:** raw text from each document (stored in context)
- **Verification:** exit code 0 + non-empty text from each file
- **If fails:** retry (maybe the PDF is scanned — try OCR with pytesseract)

### Step 2: Parse structured data from each document
- **Input:** raw text from Step 1 + a purchase order CSV (user provides)
- **AI does:** writes a Python script that:
  - Uses regex + heuristics to extract: vendor name, invoice number, date, total
    amount, line items (description, quantity, unit price, total)
  - Handles different invoice formats (the AI sees the raw text and writes
    format-specific parsing logic)
  - Outputs a structured JSON array: one object per invoice
- **Runs in sandbox:** yes (re, json, pandas)
- **Output:** JSON array of parsed invoices
- **Verification:** exit code 0 + valid JSON + all required fields present in each invoice
- **If fails:** retry with the parsing error

### Step 3: Reconcile against purchase orders
- **Input:** parsed invoices (Step 2) + purchase order CSV
- **AI does:** writes a Python script that:
  - Matches each invoice to a PO by vendor name + amount (fuzzy matching)
  - Flags: unmatched invoices (no PO found), amount mismatches (invoice != PO),
    duplicate invoices, missing POs
  - Computes: total invoiced, total matched, total disputed
- **Runs in sandbox:** yes (pandas, fuzzywuzzy)
- **Output:** reconciliation report (JSON) + matched/unmatched lists
- **Verification:** exit code 0 + valid JSON with "matched", "unmatched", "discrepancies" fields
- **If fails:** retry

### Step 4: Generate a report + chart
- **Input:** reconciliation report (Step 3) + all previous outputs
- **AI does:** writes a script that:
  - Creates a bar chart: invoiced amount by vendor (matched vs disputed)
  - Generates a plain-English summary: "X invoices matched, Y disputed, Z unmatched"
  - Lists discrepancies with details
  - Outputs a clean CSV for accounting (vendor, invoice #, amount, PO #, status)
- **Runs in sandbox:** yes (matplotlib, pandas)
- **Output:** chart.png + reconciliation.csv (artifacts)
- **Verification:** exit code 0 + both artifacts exist

### Step 5: Generate plain-English summary
- **Input:** all previous outputs
- **AI does:** writes a 3-5 sentence summary for the accounting team:
  - Total invoices processed, total amount
  - Number matched vs disputed
  - Top discrepancies
  - Recommended actions
- **Runs in sandbox:** no (LLM text generation)
- **Output:** text (stored in RunResult.summary)
- **Verification:** non-empty, contains at least one number

## Tools the agent has

| Tool | What it does | How it works |
|---|---|---|
| `extract_text` | Reads PDFs/text files, extracts all text | AI writes pdfplumber script → sandbox runs it |
| `parse_invoice` | Extracts structured fields from raw text | AI writes regex/heuristic script → sandbox runs it |
| `reconcile` | Matches invoices to POs, flags discrepancies | AI writes pandas fuzzy-match script → sandbox runs it |
| `generate_report` | Creates chart + clean CSV for accounting | AI writes matplotlib + pandas script → sandbox runs it |
| `summarize` | Writes a plain-English summary | AI generates text directly (no sandbox) |

## How the AI "thinks" across steps

Step 2 is the hardest because invoice formats vary wildly. The AI sees the raw text
from Step 1 and has to figure out the structure. It might write different parsing
logic for each invoice format. If parsing fails (e.g., a field isn't found), the
error is fed back and the AI tries a different approach.

Step 3 is where the real value is — the AI has to do fuzzy matching between invoice
vendor names and PO vendor names (e.g., "Acme Corp" vs "ACME Corporation"), and
flag amount mismatches. This requires real code, not LLM guessing.

## Verification strategy

Each step has a different verification rule:
- Step 1: exit 0 + non-empty text from each file
- Step 2: exit 0 + valid JSON + all required fields (vendor, amount, date) present
- Step 3: exit 0 + valid JSON with "matched", "unmatched", "discrepancies" arrays
- Step 4: exit 0 + chart.png exists + reconciliation.csv exists
- Step 5: non-empty text + contains at least one number

## Value proposition

- **Time saved:** 4-8 hours/month of manual data entry + reconciliation → 5 minutes
- **Accuracy:** Real code extracts and matches, not LLM guessing
- **Auditability:** Every step's code and output is visible; discrepancies are flagged
- **Safety:** Runs in a sandbox, can't touch production accounting systems
- **Reusability:** The parsing script can be saved and re-run on next month's invoices

## Why this fits the hackathon

- Multi-step agentic workflow (5 steps, each with retry)
- Actual execution (pdfplumber, pandas, fuzzy matching run in real Docker containers)
- Verifiable results (exit codes, artifacts, structured JSON)
- Business value (accounting/finance teams do this monthly)
- Containment moment (show the sandbox can't access the host's files)
- Uses Vultr VM + Vultr Serverless Inference (required)
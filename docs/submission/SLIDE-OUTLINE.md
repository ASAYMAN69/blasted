# Slide Deck Outline — Sandboxed Agent Studio

**Deliverable:** `docs/submission/slides/Sandboxed-Agent-Studio-Slides.pdf` (10 pages, 16:9, vector, embedded TrueType text)
**Source:** `docs/submission/slides/slides.html` (HTML/CSS) → `docs/submission/slides/build_pdf.sh` (headless Chromium print-to-pdf)
**Purpose:** Required hackathon slide presentation (PDF format) for Vultr Agent Rush Hackathon, Challenge 1 "Blast Radius Zero".

## Build & portability note

The deck is a **pure vector PDF**: no images, no hidden text layers. Text is embedded as real CID TrueType subsets of the site's fonts (static TTFs in `docs/submission/slides/fonts/`: Outfit SemiBold/Bold, Plus Jakarta Sans Regular/SemiBold/Bold, DejaVu Sans Mono).

Why local TTFs: when Chromium is fed Google's *variable* woff2 fonts, its `--print-to-pdf` embeds them as **Type 3 subset fonts**, which many viewers (mobile/web/older Acrobat) misrender on zoom. With **static local TTFs**, Chromium embeds genuine TrueType — selectable, searchable, zoom-crisp vector text on every device. (Rasterized builds were tried as a workaround but discarded: huge files, no real text, fragile.)

Edit `slides.html` and re-run `./build_pdf.sh` to regenerate.

---

## Design fidelity

The deck reuses the website's design system 1:1 (`frontend/src/index.css`, "Ethereal Glass" dark premium):

- **Colors**
  - Base `--bg` `hsl(240 8% 4%)` → deep space (#0a0a0f)
  - Surface `--surface` `hsl(240 6% 10%)`, lines `--line` `hsl(240 6% 22%)`
  - Ink `--ink` `hsl(0 0% 98%)`, `--ink-2` `hsl(240 6% 78%)`, `--ink-3` `hsl(240 4% 55%)`
  - Accent (violet) `--accent` `hsl(260 90% 72%)`; accent-2 (emerald) `hsl(165 80% 55%)`; ok `hsl(155 80% 58%)`
  - Aurora background: radial gradients identical to `.aurora` (violet top-left, emerald top-right, blue bottom-center)
- **Fonts**
  - Display/headings: **Outfit** (weights 500–800, same Google Fonts pull as `frontend/index.html`)
  - Body: **Plus Jakarta Sans** (400–700)
  - Code/mono labels: `ui-monospace` stack (renders as DejaVu Sans Mono in Linux Chromium)
- **Style rules:** sharp corners (no border-radius), eyebrow tags (11px, uppercase, tracked 0.18em, violet), 1px hairline borders, glow on key numerals, generous whitespace.

## Page map

| # | Slide | Content | Judging criterion |
|---|---|---|---|
| 1 | Cover | Brand, challenge tag, live URL, repo, three-agent capability chips | Presentation |
| 2 | The problem | "AI can describe work — can it be trusted to do it?" outputs/escape/trust/proof + business case | Business Value |
| 3 | The solution | Centralized control layer: real work, verifiable, contained; three agents, one engine | Application of Technology |
| 4 | Architecture | Vultr VM topology: Browser → nginx → FastAPI/Engine → LLM (Vultr Serverless Inference) → Sandbox Manager → Docker container; SQLite, artifacts, SSE, CI/CD | Application of Technology |
| 5 | The agentic loop | INTERPRET → PLAN → GENERATE → SANITIZE → EXECUTE → VERIFY → EXPLAIN → RETRY (bounded) → FINALIZE | Application of Technology |
| 6 | Containment (hero) | The 8 guarantees table + proof snippets (uid 1000, EROFS, NET_BLOCKED, OOM 137, timeout 124, 0 leftover containers) | Originality / Application |
| 7 | Three agents | Data Analyst, Invoice Reconciler, Incident Investigator — pipelines, inputs, artifacts; multi-file upload strip (up to 20 files, text-only steps persist .json/.txt) | Application / Business Value |
| 8 | Vultr | Cloud Compute VM (2 vCPU/4 GB), Serverless Inference (mimo-v2.6-flash), Docker sandboxes; provider abstraction; live deploy | Application of Technology |
| 9 | Proof & testing | 52 backend tests, 12 containment negative tests, 3 agents, 20 files/upload; E2E verified incl. artifact persistence and empty-artifact messaging | Application / Credibility |
| 10 | Closing | "Trust through containment and evidence"; judging alignment cards; URLs | Presentation |

## Regenerate

```bash
# From the slides directory — requires Chromium at /usr/bin/chromium.
# Fonts are local (no network needed).
cd docs/submission/slides
./build_pdf.sh
```

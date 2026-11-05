# HANDOFF.md — Sandboxed Agent Studio (blasted)

**Date:** 2026-11-06
**Repo:** https://github.com/ASAYMAN69/blasted (public, main branch)
**Live app:** http://45.76.2.228
**Event:** Vultr: Agent Rush Hackathon — Challenge 1 "Blast Radius Zero"
**Online phase ends:** 2026-11-08 | **Submission deadline:** 2026-11-09 05:00 +06:00 (Asia/Dhaka)

---

## 1. What we're building

A **web-based AI agent that performs real work through code execution**, with every
action contained in isolated, disposable sandboxes running on Vultr infrastructure.
The app is a centralized control layer that plans tasks, dispatches execution, and
returns verifiable results.

**Challenge 1: "Blast Radius Zero"** — the core requirement is that all agent actions
execute inside isolated sandboxes on Vultr. We built a platform where users submit
tasks, an AI agent writes code, the code runs in a real Docker container (not
simulated), and the output is returned with proof. The container is destroyed after
every task. The AI never touches the host, never sees secrets, and never escapes.

**Our intention:** Build a product that solves a REAL business problem (safe AI code
execution with proof), not a toy. Every feature must provide genuine value. The
containment story is the differentiator — no other team will have a provable
"Blast Radius Zero" moment. The product is the foundation; the pitch (video/slides/
README) is the multiplier.

## 2. What features exist

### 5 multi-step business-value agents (the core product)
Each agent is a multi-step pipeline where each step's output feeds the next. Each
step runs in a separate sandbox with its own retry budget.

| Agent | Pipeline | Business value |
|---|---|---|
| **Messy Data → Decision** (data-analyst) | profile → clean → analyze → chart → report | Turns hours of Excel work into 30 seconds |
| **Invoice Reconciler** (invoice-reconciler) | extract → parse → reconcile → report → summarize | Automates invoice processing + PO matching |
| **Research Synthesizer** (research-synthesizer) | fetch → extract claims → cross-reference → report → summarize | Replaces hours of manual research synthesis |
| **Incident Investigator** (incident-investigator) | profile → detect anomalies → correlate → hypothesize → verify fix → report | Automates DevOps incident investigation |
| **Data Pipeline** (data-pipeline) | profile → clean → analyze → charts → insights | Full data science pipeline in one click |

### 4 legacy single-step modes (kept in registry, hidden from UI)
- **CSV Analyst** — CSV + question → real stats + chart + JSON
- **Code Reviewer** — Python file + goal → self-heals broken code
- **Chart Anything** — Data + chart request → real PNG/HTML chart
- **File Fixer** — File + desired behavior → unified diff + verified re-run

### Frontend features
- Dedicated page per tool (5 tools) with drag & drop file upload
- Home page with tool cards (what each tool does, not product descriptions)
- Live CSV/table preview with safe horizontal overflow
- Quick-action suggestion chips (one-tap questions from column analysis)
- Chart styling panel (5 palettes + 7 chart types)
- Structured result rendering (stat grid + data table + verdict chips)
- Markdown rendering of AI summaries
- Copy-to-clipboard on summaries
- Ctrl/Cmd+Enter to submit
- Try example button per mode
- Dark premium "Ethereal Glass" design with Framer Motion animations
- Sharp corners (industrial-brutalist direction)
- Mobile-first: bottom tab bar, 44px+ targets, safe-area aware
- `prefers-reduced-motion` respected, hover gated to fine pointers
- Run history with server + localStorage merge

### Infrastructure
- CI/CD pipeline: branch → CI (tests + build) → PR → review → merge → auto-deploy
- Branch protection: requires both CI checks to pass
- Vultr VM (2 vCPU/4GB) with nginx + FastAPI + Docker
- Vultr Serverless Inference as primary LLM (mimo-v2.6-flash)
- 52 backend tests (unit + integration + 12 containment negative tests)
- Security audit fixes (path traversal, size enforcement, ast.literal_eval guard)

## 3. Why it works (the containment story)

Every task runs in an isolated Docker container:
- **Non-root user** (`runner`), read-only rootfs, only `/workspace` writable
- **No network** (`--network none`) — zero egress
- **Memory/CPU limits** (512m / 0.5 CPU, configurable)
- **Wall-clock timeout** (60s default, kills runaway loops)
- **Container destroyed** after every task (force-removed on success, error, timeout, OOM)
- **No secrets in sandbox** — LLM keys never enter the container
- **Artifacts persisted** to `data/artifacts/<task_id>/` before container destruction

This is provable: 12 containment negative tests verify each guarantee. The "containment moment" in the demo video (sandbox trying to read host secrets → failing → container destroyed) is the #1 differentiator.

## 4. Relevant files and why they're relevant

### Core backend
| File | Purpose | Why it's relevant |
|---|---|---|
| `backend/app/engine/orchestrator.py` | Agentic loop + Task/RunResult models + extract_parsed + _run_pipeline | The brain. Contains the multi-step pipeline engine, LLM calls, verification, retry logic, context accumulation |
| `backend/app/sandbox/manager.py` | Docker sandbox executor | The containment. Docker container creation, limits, timeout, cleanup, artifact persistence |
| `backend/app/engine/modes/base.py` | Mode protocol + Step dataclass + Verification model | The contract. All modes implement this. PipelineMode adds multi-step support |
| `backend/app/engine/modes/__init__.py` | Mode registry | Maps mode name → class. Frozen during multi-agent phase, now editable |
| `backend/app/engine/modes/vector1.py` | Messy Data → Decision (5 steps) | Profile → clean → analyze → chart → report |
| `backend/app/engine/modes/vector3.py` | Invoice Reconciler (5 steps) | Extract → parse → reconcile → report → summarize |
| `backend/app/engine/modes/vector4.py` | Research Synthesizer (5 steps) | Fetch → extract claims → cross-reference → report → summarize |
| `backend/app/engine/modes/vector5.py` | Incident Investigator (6 steps) | Profile → detect anomalies → correlate → hypothesize → verify fix → report |
| `backend/app/engine/modes/vector6.py` | Data Pipeline (5 steps) | Profile → clean → analyze → charts → insights |
| `backend/app/llm/vultr.py` | Vultr Serverless Inference client | Required for Challenge 1 scoring. OpenAI-compatible, handles thinking models |
| `backend/app/llm/__init__.py` | LLM factory (vultr → ollama → openrouter) | Provider selection logic |
| `backend/app/api/routes.py` | REST + SSE endpoints | Task submission, status, live progress, artifact serving |
| `backend/app/main.py` | FastAPI app + CORS + SPA serving | Entry point, static file serving, SPA fallback |
| `backend/app/config.py` | Pydantic settings (env vars) | All configuration |
| `backend/app/store/db.py` | SQLite (task history + artifacts) | Persistence layer |

### Frontend
| File | Purpose | Why it's relevant |
|---|---|---|
| `frontend/src/App.jsx` | Shell (side rail + top bar + nav + routes) | Layout, routing, navigation |
| `frontend/src/api.js` | API client (configurable origin) | All backend communication (REST + SSE) |
| `frontend/src/components/Home.jsx` | Landing page with tool cards | First impression, tool discovery |
| `frontend/src/components/ToolPage.jsx` | Reusable tool page (per agent) | Form, drag & drop, pipeline preview, visual options |
| `frontend/src/components/TaskDetail.jsx` | Task result + progress + artifacts | Shows structured results, charts, diffs |
| `frontend/src/components/TaskProgress.jsx` | SSE live progress + step indicator | Real-time agent activity display |
| `frontend/src/components/ArtifactViewer.jsx` | Renders artifacts by kind | Images, tables, diffs, code |
| `frontend/src/components/ParsedResult.jsx` | Structured AI result rendering | Stat grid + data table + verdict chips |
| `frontend/src/components/CsvPreview.jsx` | Live CSV table preview | Instant visual confirmation of data |
| `frontend/src/components/QuickActions.jsx` | One-tap suggestions | Contextual question suggestions |
| `frontend/src/components/DropZone.jsx` | Drag & drop file upload | File input with drag-over feedback |
| `frontend/src/components/Markdown.jsx` | Safe markdown renderer | AI summaries render as styled HTML |
| `frontend/src/components/ui.jsx` | Shared primitives (Panel, Badge, etc.) | Design system components |
| `frontend/src/csvHints.js` | CSV introspection + preview parser | Column classification, suggestions |
| `frontend/src/examples.js` | Sample data per mode | "Try example" button data |
| `frontend/src/index.css` | Design system (dark premium, sharp corners) | All styling tokens and component classes |
| `frontend/vite.config.js` | Vite config + git SHA injection | Build-time SHA for deploy verification |

### Documentation
| File | Purpose | Why it's relevant |
|---|---|---|
| `docs/plans/00-overview.md` | AI architecture in plain English | How thinking works, tool outputs, context management |
| `docs/plans/01-vector1-messy-data.md` | Vector 1 plan | Step-by-step pipeline design |
| `docs/plans/02-vector3-document-reconcile.md` | Vector 3 plan | Invoice reconciliation pipeline |
| `docs/plans/03-vector4-research-synthesis.md` | Vector 4 plan | Research synthesis pipeline |
| `docs/plans/04-vector5-anomaly-rootcause.md` | Vector 5 plan | Incident investigation pipeline |
| `docs/plans/05-vector6-data-pipeline.md` | Vector 6 plan | Data science pipeline |
| `docs/plans/06-flowchart.md` | Build order + design rules | What to build when + design constraints |
| `docs/CODE-AUDIT.md` | Full audit report | 22 findings with priority order |
| `docs/submission/DEPLOYMENT.md` | Production deployment guide | VM setup, services, gotchas |
| `docs/submission/CICD.md` | CI/CD pipeline docs | Workflows, secrets, deploy script |
| `docs/superpowers/specs/2026-11-02-vultr-agent-rush-design.md` | Original approved design | The foundational design document |
| `CONTEXT/AGENTS.md` | Agent coordination rules | Ownership map, conventions, deploy order |
| `CONTEXT/CONTRACTS.md` | Frozen interfaces | LLMClient, Mode, SandboxManager, API, env vars |
| `backend/tests/CONTAINMENT_PROOF.md` | Demo snippets | Containment test snippets for the video |

## 5. User's style of working

### How the user operates
- **Orchestrator role:** The user deploys sub-agents and handles all git operations. They don't write code themselves — they direct AI agents.
- **Branch → PR → Review → Merge → Deploy:** Every change goes through a PR. CI must pass. The user (or lead agent) reviews and merges. CD auto-deploys on merge.
- **Plain English first:** The user explicitly asked for documentation in "raw English, basic English" so they can understand what's being built without reading code.
- **Iterative refinement:** The user tests the live app, reports issues, and expects fixes. They're hands-on with testing.
- **No patience for fluff:** The user is direct, sometimes blunt. They want results, not explanations. "Just do it" energy.
- **Visual/UX-focused:** The user cares deeply about how the UI looks and feels. They've asked for multiple design overhauls.
- **Pragmatic:** They prefer "it works" over "it's perfect." They accept tradeoffs when explained clearly.
- **Trust but verify:** They test everything themselves (browser, API, curl) and report back.

### Communication preferences
- Be direct and concise
- Don't over-explain — show, don't tell
- Use the CI/CD pipeline for everything (no direct pushes to main unless necessary)
- Report what was done + what's verified, not what's planned
- When something breaks, fix it and deploy — don't ask for permission
- The user values transparency: "I want to understand what you're doing for each tool"

### What frustrates the user
- Generic/template-looking UI ("trash", "begging to hold together")
- Single-step tools when they asked for multi-step
- Features that don't provide real value ("dummy csv stuff")
- Not using Vultr (disqualification risk)
- Not listening to their feedback
- Over-engineering without delivering

## 6. Skills we're using and why

### Design skills
| Skill | Why we use it |
|---|---|
| `impeccable` | Production-grade frontend design. Context gathering, register identification (brand vs product), design laws (color, typography, layout, motion, absolute bans). Used for the overall design system. |
| `frontend-design` | Distinctive visual identity. Deliberate palette, typography, layout choices specific to the brief. Avoids generic AI-looking designs. |
| `ui-ux-pro-max` | 50+ styles, 161 color palettes, 57 font pairings, 99 UX guidelines. Used for design system generation and UX best practices. |
| `high-end-visual-design` | "Awwwards-tier" design. Double-Bezel architecture, magnetic buttons, fluid motion, $150k agency look. Used for the premium feel. |
| `industrial-brutalist-ui` | Sharp corners, utilitarian aesthetics, rigid grids. Used for the "cornered" design direction (no border-radius). |
| `minimalist-ui` | Warm monochrome, editorial typography, bento grids. Used for the clean, uncluttered aesthetic. |
| `animate` | Animation construction. Hard rules: frequency-based decisions, transform/opacity only, specific easing curves, reduced-motion support. Used for all motion. |

### Process skills
| Skill | Why we use it |
|---|---|
| `brainstorming` | Design before coding. Explores intent, requirements, approaches before implementation. Used for every feature. |
| `systematic-debugging` | Root-cause debugging. Used when things break. |
| `writing-plans` | Detailed implementation plans. Used before coding. |
| `verification-before-completion` | Evidence before claims. Run tests before saying "done." |
| `test-driven-development` | Red-green-refactor. Used for backend tests. |

### How we apply them
1. **Brainstorming** → understand what to build
2. **Design skill** (impeccable/frontend-design) → design the UI
3. **Animate** → add motion following the rules
4. **Writing-plans** → detailed implementation plan
5. **Code** → implement
6. **Verification** → run tests, check build
7. **Deploy** → push, PR, merge, auto-deploy

## 7. What our next step is

### The single biggest gap: Presentation
The product is done. The pitch is missing. The rulebook says judges score "all features demonstrated in the video" and "clarity of presentation." We have zero video, zero slides, zero narrative.

### What to do next (in priority order)

1. **Demo video script** — 90-second script with the containment moment as the centerpiece
   - Hook: "AI can write code — but would you trust it to run on your machine?"
   - Problem: models hallucinate, no isolation, no proof
   - Solution: Sandboxed Agent Studio — real code, real output, real proof
   - Demo: show 2-3 modes working with real data
   - Containment moment: sandbox trying to read host secrets → failing → container destroyed
   - Impact + CTA: "Blast radius: zero." Link to app + repo

2. **Record the video** — use the live app (http://45.76.2.228), export as MP4

3. **Slide deck (PDF)** — 8-10 pages: problem → architecture → containment → demo screenshots → business value → tech stack

4. **Architecture writeup** — `docs/submission/ARCHITECTURE.md` (deeper than README)

5. **README** — ✅ already done (Vultr services, architecture, setup)

6. **Submit on lablab.ai** — mandatory (not just Vultr Community)

### Containment proof snippets (for the video)
See `backend/tests/CONTAINMENT_PROOF.md` for the exact commands to run on camera:
- `cat /etc/hostname` → blocked (shows isolation)
- `print(open('/proc/1/environ').read())` → fails (shows no secret leak)
- Memory limit kills runaway allocation (exit 137)
- Timeout kills runaway sleep (exit 124)
- `docker ps -a` after run → 0 containers (shows lifecycle discipline)

## 8. Current progress

| Requirement | Status |
|---|---|
| Public GitHub repo | ✅ `ASAYMAN69/blasted` (public) |
| Working demo app | ✅ live at http://45.76.2.228 |
| Vultr VM backend | ✅ deployed (2 vCPU/4GB, Docker sandbox) |
| Vultr Serverless Inference | ✅ primary LLM (mimo-v2.6-flash) |
| All 5 agents work | ✅ all complete end-to-end (verified live) |
| Containment | ✅ enforced + tested (12 negative tests) |
| CI/CD pipeline | ✅ branch → CI → PR → review → merge → auto-deploy |
| Presentation (video + slides) | ⏳ **not started** — the biggest gap |
| Architecture writeup | ⏳ partial (DEPLOYMENT.md + CICD.md exist) |
| README | ✅ done (Vultr services, architecture, setup) |

## 9. Key gotchas (hard-won lessons)

1. **Python 3.10 on the VM** (Ubuntu 22.04) — pyproject allows `>=3.10`
2. **`.env` must be readable by `sandbox` user** — `chown sandbox:sandbox .env`, `chmod 600`
3. **Sandbox workspace permissions** — `mkdtemp` 0700 blocks the container's `runner` user; fixed by chmod 0777/0666
4. **No package-lock.json** — use `npm install --legacy-peer-deps` (not `npm ci`)
5. **Git dubious ownership** — service user `sandbox` can't read root-owned repo; fixed via `git config --system safe.directory`
6. **Free model is slow** — ~5-15s per attempt; use mimo-v2.6-flash (fastest on Vultr)
7. **Self-approval impossible on GitHub** — approval recorded as PR comment; merge via admin rights
8. **SPA routing** — StaticFiles with html=True doesn't serve index.html for unknown paths; use catch-all route
9. **Missing imports** — docstring edits can accidentally drop import lines; always build after edits
10. **Model generates conversational text** — need strong system prompts ("Output ONLY raw Python code") and tolerant verification
11. **`useReducedMotion` etc.** — must be imported from framer-motion in every file that uses it

## 10. Git state

- Branch: `main` (clean, up to date with origin)
- Last commit: `c194db4` (fix: SPA fallback route)
- 39+ PRs merged, all CI green
- Working tree clean

## 11. Important files to read first

1. `CONTEXT/AGENTS.md` — global rules, ownership map, conventions
2. `CONTEXT/CONTRACTS.md` — frozen interfaces (LLMClient, Mode, SandboxManager, API, env)
3. `CONTEXT/STATUS.md` — coordination ledger
4. `docs/superpowers/specs/2026-11-02-vultr-agent-rush-design.md` — approved design
5. `docs/plans/00-overview.md` — AI architecture in plain English
6. `backend/app/engine/orchestrator.py` — the brain (multi-step pipeline)
7. `backend/app/sandbox/manager.py` — the containment
8. `backend/app/engine/modes/*.py` — the 5 agents + 4 legacy modes
9. `frontend/src/App.jsx` — the UI shell
10. `frontend/src/components/ToolPage.jsx` — the per-tool form
11. `backend/tests/CONTAINMENT_PROOF.md` — demo snippets for the video

---

**Bottom line for the next agent:** The product is done and deployed. The codebase is clean, tested, and documented. The single biggest gap is the **pitch** (video + slides + narrative). The containment story is the differentiator. Everything else is a nice-to-have. Focus 100% on the presentation — that's what will determine the score.
# TASK 01 — engine (Orchestrator + LLM Client)

## Role
Implement the core agentic loop and the LLM provider abstraction. This is the brain of
Sandboxed Agent Studio.

## Write scope (ONLY these)
- `backend/app/engine/orchestrator.py`
- `backend/app/engine/__init__.py`
- `backend/app/llm/base.py` — READ ONLY (frozen); do NOT edit
- `backend/app/llm/__init__.py`
- `backend/app/llm/openrouter.py`
- `backend/app/llm/vultr.py`
- `backend/app/api/**`
- `backend/app/main.py`
- `backend/app/config.py`

FROZEN (read-only, never edit): `backend/app/engine/modes/base.py`,
`backend/app/engine/modes/__init__.py`, `backend/app/store/**`.

## Depends on
- `sandbox` agent's `SandboxManager` interface (`backend/app/sandbox/manager.py`) — call it, don't implement it.
- Frozen contracts in `CONTEXT/CONTRACTS.md`.

## What to build
1. `config.py` — pydantic-settings `Settings` reading the env vars in CONTRACTS §6.
2. `llm/base.py` already exists (frozen). Implement:
   - `openrouter.py`: `OpenRouterClient` using the Anthropic SDK
     (`anthropic.Anthropic(base_url="https://openrouter.ai/api/v1", api_key=...)`),
     model from `OR_MODEL`. `generate` → `client.messages.create(...)`; `generate_json`
     → parse JSON from the message.
   - `vultr.py`: `VultrLLMClient` — DISABLED stub. Complete the implementation against
     `https://api.vultrinference.com/v1` (OpenAI-compatible), but gate it:
     raise `RuntimeError` unless `VULTR_LLM_ENABLED=true`. Add a clear TODO noting we
     still need Vultr's auth-header/model-list docs to finish it.
   - `__init__.py`: `get_llm_client(config)` selects Vultr if enabled else OpenRouter.
3. `api/routes.py` — FastAPI router implementing CONTRACTS §5 endpoints, incl. SSE
   progress via `run_loop`.
4. `main.py` — FastAPI app, mount router, serve built frontend static files.
5. `orchestrator.py` — the loop: interpret → plan → generate → sanitize → execute
   (via `SandboxManager`) → verify (via mode's `verify`) → explain → retry (≤
   `MAX_RETRIES`, feeding errors back) → finalize. Thread through the requested mode's
   code generation prompts.

## Acceptance criteria
- `get_llm_client` returns OpenRouter by default and Vultr when enabled.
- With a real `OPENROUTER_API_KEY`, a generated prompt returns text.
- Submitting a task produces a `RunResult` with status/attempts/summary.
- All functions are type-hinted; public functions have docstrings.

## Note
Do not implement sandbox logic. Call the `SandboxManager` protocol.

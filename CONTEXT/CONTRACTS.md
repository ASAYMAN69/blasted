# CONTRACTS.md — Frozen Interfaces (READ-ONLY)

These interfaces are the contracts between agents. They are owned by the lead and are
**FROZEN**: agents implement against them but must never modify them. Changes go through
`CONTEXT/STATUS.md` (contract change requests) and the lead.

---

## 1. LLMClient (backend/app/llm/base.py)

```python
class LLMClient(Protocol):
    provider_name: str
    def generate(self, prompt: str, system: str | None = None,
                 max_tokens: int = 1024) -> str: ...
    def generate_json(self, prompt: str, schema: dict) -> dict: ...
```

Implementations:
- `OpenRouterClient` — ACTIVE default. Anthropic SDK,
  `base_url="https://openrouter.ai/api/v1"`, model from env `OR_MODEL`.
- `VultrLLMClient` — DISABLED stub. OpenAI-compatible client at
  `https://api.vultrinference.com/v1`. Gated behind `VULTR_LLM_ENABLED=true`.

Selection: `get_llm_client(config)` in `backend/app/llm/__init__.py`.
If `VULTR_LLM_ENABLED` is true and `VULTR_LLM_API_KEY` is set → Vultr; else OpenRouter.

## 2. Mode (backend/app/engine/modes/base.py)

```python
class Verification(BaseModel):
    ok: bool
    reason: str

class Mode(Protocol):
    name: str                                # e.g. "csv"
    input_schema: dict                       # JSON schema for validated inputs
    def build_plan_prompt(self, task: Task) -> str: ...
    def build_code_prompt(self, task: Task, plan: str) -> str: ...
    def verify(self, execution: ExecutionResult) -> Verification: ...
```

Registry: `MODE_REGISTRY` in `backend/app/engine/modes/__init__.py`
maps name → class. FROZEN.

## 3. SandboxManager (backend/app/sandbox/manager.py)

```python
class ExecutionResult(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    artifacts: list[str]      # filenames copied out of /workspace

class SandboxManager(Protocol):
    async def execute(self, code: str, files: dict[str, str],
                      timeout_s: int | None = None,
                      artifact_out_dir: str | Path | None = None) -> ExecutionResult: ...
```

`artifact_out_dir` (added by lead integration fix): when given, artifact files are
copied from the ephemeral workspace into this directory before the workspace is
deleted — this is what makes `GET /api/artifacts/...` work.

Containment guarantees (must hold): non-root user, read-only rootfs except `/workspace`,
memory/CPU limits, wall-clock timeout, container destroyed after every task.
v1: no network in sandbox.

## 4. Engine / Task / Run (backend/app/engine/orchestrator.py)

```python
class Task(BaseModel):
    id: str
    mode: str
    inputs: dict
    created_at: datetime

class RunResult(BaseModel):
    task_id: str
    status: Literal["queued", "running", "passed", "failed"]
    attempts: int
    summary: str
    artifacts: list[str]

class Orchestrator:
    async def submit(self, mode: str, inputs: dict) -> Task: ...
    async def get(self, task_id: str) -> RunResult | None: ...
    def run_loop(self, task: Task) -> AsyncIterator[RunResult]: ...  # SSE progress
```

The loop: interpret → plan → generate code → sanitize → sandbox-execute → verify →
explain → bounded retry (default 3 attempts) → finalize.

## 5. HTTP API (backend/app/api/routes.py)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/tasks` | submit a task `{mode, inputs}` → `Task` |
| GET | `/api/tasks` | list known tasks as RunResult summaries (newest first) |
| GET | `/api/tasks/{id}` | run status + result |
| GET | `/api/tasks/{id}/events` | SSE stream of progress |
| GET | `/api/artifacts/{task_id}/{name}` | fetch artifact |
| GET | `/api/modes` | list available modes |

## 6. Environment variables (backend/app/config.py)

```
OPENROUTER_API_KEY, OR_MODEL
VULTR_LLM_ENABLED (default false), VULTR_LLM_API_KEY, VULTR_LLM_MODEL
SANDBOX_MEMORY (default "512m"), SANDBOX_CPUS (default "0.5"),
SANDBOX_TIMEOUT_S (default 60), SANDBOX_IMAGE (default "sandbox-runner:latest")
MAX_TASK_SIZE_MB (default 25), MAX_RETRIES (default 3)
```

// API client. Backend contract in CONTEXT/CONTRACTS.md §5.
//
// Design: one BASE (from VITE_BACKEND_ORIGIN) so the same code works in
// dev (Vite proxy, same-origin) and prod (FastAPI static mount / nginx) and
// cross-origin setups (direct backend URL). All helpers throw ApiError so
// views can tell "server down" (status 0) from "4xx/5xx" apart.
//
// SSE is used (not WebSockets) for live progress because it's one-way and
// needs no client-side state machine — the browser reconnects automatically.

const ORIGIN = String(import.meta.env.VITE_BACKEND_ORIGIN || '').replace(/\/+$/, '')
const BASE = ORIGIN ? `${ORIGIN}/api` : '/api'

export class ApiError extends Error {
  /**
   * @param {number} status HTTP status, or 0 for network/server-down
   * @param {string} message
   */
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function parseError(res) {
  let message = `HTTP ${res.status}`
  try {
    const body = await res.json()
    if (body && typeof body.detail === 'string') message = body.detail
    else if (body && typeof body.detail === 'object') {
      message = JSON.stringify(body.detail)
    }
  } catch {
    /* keep default message */
  }
  return new ApiError(res.status, message)
}

async function jsonRequest(path, options = {}) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, options)
  } catch {
    throw new ApiError(0, 'Cannot reach the API server. Is the backend running on :8000?')
  }
  if (!res.ok) throw await parseError(res)
  return res.json()
}

/** GET /api/modes -> [{name, input_schema}] */
export function listModes() {
  return jsonRequest('/modes')
}

/** POST /api/tasks -> Task */
export function submitTask(mode, inputs) {
  return jsonRequest('/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, inputs }),
  })
}

/** GET /api/tasks/{id} -> RunResult */
export function getTask(taskId) {
  return jsonRequest(`/tasks/${encodeURIComponent(taskId)}`)
}

/**
 * GET /api/tasks (list) — NOT in the frozen contract yet. Probed quietly by
 * the history dashboard; a 404 means the backend doesn't expose it and we
 * fall back to local history. Resolved to null when unavailable.
 */
export async function listTasks() {
  try {
    const data = await jsonRequest('/tasks')
    return Array.isArray(data) ? data : null
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

/**
 * Subscribe to GET /api/tasks/{id}/events (SSE).
 *
 * @param {string} taskId
 * @param {object} handlers {onEvent, onError, onOpen}
 * @returns {{close: () => void}}
 */
export function taskEvents(taskId, { onEvent, onError, onOpen } = {}) {
  const es = new EventSource(`${BASE}/tasks/${encodeURIComponent(taskId)}/events`)
  es.onmessage = (e) => {
    try {
      onEvent?.(JSON.parse(e.data))
    } catch {
      /* ignore malformed frames */
    }
  }
  es.onopen = () => onOpen?.()
  es.onerror = () => {
    // EventSource auto-reconnects; surface it but don't throw.
    onError?.()
  }
  return {
    close() {
      es.close()
    },
  }
}

/** GET /api/artifacts/{task_id}/{name} */
export function artifactUrl(taskId, name) {
  return `${BASE}/artifacts/${encodeURIComponent(taskId)}/${encodeURIComponent(name)}`
}

/** Fetch an artifact's text content (for tables/logs/diffs). */
export async function fetchArtifactText(taskId, name) {
  let res
  try {
    res = await fetch(artifactUrl(taskId, name))
  } catch {
    throw new ApiError(0, 'Cannot reach the API server while loading the artifact.')
  }
  if (!res.ok) throw await parseError(res)
  return res.text()
}

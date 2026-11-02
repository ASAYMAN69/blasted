// API client (TASK 07). Backend contract in CONTEXT/CONTRACTS.md §5.
const BASE = '/api'

export async function listModes() {
  const res = await fetch(`${BASE}/modes`)
  if (!res.ok) throw new Error(`GET /modes -> ${res.status}`)
  return res.json()
}

export async function submitTask(mode, inputs) {
  const res = await fetch(`${BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, inputs }),
  })
  if (!res.ok) throw new Error(`POST /tasks -> ${res.status}`)
  return res.json()
}

export async function getTask(taskId) {
  const res = await fetch(`${BASE}/tasks/${taskId}`)
  if (!res.ok) throw new Error(`GET /tasks/${taskId} -> ${res.status}`)
  return res.json()
}

export function taskEvents(taskId, onEvent) {
  const es = new EventSource(`${BASE}/tasks/${taskId}/events`)
  es.onmessage = (e) => onEvent(JSON.parse(e.data))
  return es
}

export function artifactUrl(taskId, name) {
  return `${BASE}/artifacts/${taskId}/${encodeURIComponent(name)}`
}

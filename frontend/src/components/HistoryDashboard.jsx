// Run-history dashboard (TASK 07).
//
// The frozen contract has no GET /api/tasks list endpoint yet — so history is
// sourced from localStorage (tasks submitted in this browser), and we quietly
// probe GET /api/tasks for a future backend list endpoint (merged if present).
// Each row shows status/attempts and links to the detail view.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTask, listTasks } from '../api.js'
import { Card, CardHeader, EmptyState, ErrorState, Spinner, StatusBadge } from './ui.jsx'

const STORAGE_KEY = 'brz.tasks'

function loadLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

function saveLocal(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* ignore quota/availability errors */
  }
}

export default function HistoryDashboard() {
  const [local, setLocal] = useState(loadLocal)
  const [serverTasks, setServerTasks] = useState(null)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const refreshLocal = useCallback(async () => {
    const ids = Object.keys(loadLocal())
    if (ids.length === 0) return
    setRefreshing(true)
    try {
      await Promise.all(
        ids.map(async (id) => {
          try {
            const r = await getTask(id)
            setLocal((prev) => {
              const next = { ...prev }
              if (next[id]) {
                next[id] = { ...next[id], status: r.status, attempts: r.attempts }
              }
              return next
            })
          } catch {
            /* keep last known local status */
          }
        }),
      )
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    listTasks()
      .then((data) => {
        if (!alive) return
        setServerTasks(data)
        // Merge server freshness into local records when ids overlap.
        if (Array.isArray(data) && data.length > 0) {
          setLocal((prev) => {
            const next = { ...prev }
            for (const t of data) {
              if (next[t.task_id] && t.status) {
                next[t.task_id] = { ...next[t.task_id], status: t.status, attempts: t.attempts }
              }
            }
            return next
          })
        }
      })
      .catch(() => alive && setServerTasks(null))
    return () => {
      alive = false
    }
  }, [])

  const rows = useMemo(() => {
    const map = { ...local }
    if (Array.isArray(serverTasks)) {
      for (const t of serverTasks) {
        if (t.task_id && !map[t.task_id]) {
          map[t.task_id] = {
            id: t.task_id,
            mode: t.mode || 'task',
            created_at: t.created_at || '',
            status: t.status || 'queued',
            attempts: t.attempts ?? 0,
          }
        }
      }
    }
    return Object.values(map).sort((a, b) =>
      String(b.created_at || '').localeCompare(String(a.created_at || '')),
    )
  }, [local, serverTasks])

  const fmt = (iso) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Run history"
          subtitle="Tasks submitted from this browser (server list endpoint not yet in the contract)"
          actions={
            <button
              type="button"
              onClick={refreshLocal}
              disabled={refreshing}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? <Spinner label="Refreshing…" /> : 'Refresh'}
            </button>
          }
        />
        {error ? <div className="px-5 py-4"><ErrorState message={error} /></div> : null}
        {rows.length === 0 ? (
          <EmptyState title="No tasks yet">
            Submit a task from the{' '}
            <Link to="/" className="font-medium text-slate-900 underline underline-offset-2">
              new task
            </Link>{' '}
            page.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/tasks/${t.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-sm text-slate-900">
                      {t.id.slice(0, 8)}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {t.mode} · {fmt(t.created_at)}
                    </span>
                  </span>
                  <StatusBadge status={t.status} attempts={t.attempts} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

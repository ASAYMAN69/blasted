// Run-history dashboard. Sources: server GET /api/tasks (merged) + localStorage
// fallback. Each row links to the detail view.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTask, listTasks } from '../api.js'
import { Panel, PanelHeader, EmptyState, ErrorState, Spinner, StatusBadge } from './ui.jsx'

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
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Run history</h1>
          <p className="mt-1 text-sm text-ink-3">Every task, its outcome, and its attempts.</p>
        </div>
        <button
          type="button"
          onClick={refreshLocal}
          disabled={refreshing}
          className="btn btn-secondary flex-none text-sm"
        >
          {refreshing ? <Spinner label="Refreshing…" /> : 'Refresh'}
        </button>
      </div>

      <Panel>
        {error ? <div className="px-4 pt-4"><ErrorState message={error} /></div> : null}
        {rows.length === 0 ? (
          <EmptyState title="No tasks yet">
            Submit a task from the{' '}
            <Link to="/" className="font-semibold text-accent underline underline-offset-2">
              new task
            </Link>{' '}
            page.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/tasks/${t.id}`}
                  className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:px-5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-sm font-medium text-ink">
                      {t.id.slice(0, 8)}
                    </span>
                    <span className="block text-xs text-ink-3">
                      {t.mode} · {fmt(t.created_at)}
                    </span>
                  </span>
                  <StatusBadge status={t.status} attempts={t.attempts} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

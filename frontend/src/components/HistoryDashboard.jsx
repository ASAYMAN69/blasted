// Run-history dashboard — staggered entrance, hover-lift rows.

import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTask, listTasks } from '../api.js'
import { EASE, EmptyState, ErrorState, Panel, Spinner, StatusBadge } from './ui.jsx'

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
  const reduce = useReducedMotion()
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
            /* keep last known */
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
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="mx-auto max-w-3xl space-y-6 pb-24 lg:pb-0"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Execution log</div>
          <h1 className="mt-2.5 text-3xl font-bold tracking-tight">
            <span className="text-gradient">Run history</span>
          </h1>
          <p className="mt-2 text-[15px] text-ink-3">Every task, its outcome, and its attempts.</p>
        </div>
        <motion.button
          type="button"
          onClick={refreshLocal}
          disabled={refreshing}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="btn btn-secondary flex-none text-sm"
        >
          {refreshing ? <Spinner label="Refreshing…" /> : 'Refresh'}
        </motion.button>
      </div>

      <Panel>
        {error ? <div className="px-5 pt-4"><ErrorState message={error} /></div> : null}
        {rows.length === 0 ? (
          <EmptyState
            icon={
              <svg aria-hidden="true" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            }
            title="No tasks yet"
          >
            Submit a task from the{' '}
            <Link to="/" className="font-semibold text-accent underline underline-offset-2">
              new task
            </Link>{' '}
            page.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((t, i) => (
              <motion.li
                key={t.id}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE, delay: Math.min(i * 0.04, 0.4) }}
              >
                <Link
                  to={`/tasks/${t.id}`}
                  className="group flex flex-wrap items-center justify-between gap-2.5 px-5 py-4 transition-colors duration-fast ease-out hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="block truncate font-mono text-sm font-medium text-ink">
                        {t.id.slice(0, 8)}
                      </span>
                      <svg aria-hidden="true" className="h-3.5 w-3.5 text-ink-3 opacity-0 transition-opacity duration-fast ease-out group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-3">
                      {t.mode} · {fmt(t.created_at)}
                    </span>
                  </span>
                  <StatusBadge status={t.status} attempts={t.attempts} />
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </Panel>
    </motion.div>
  )
}

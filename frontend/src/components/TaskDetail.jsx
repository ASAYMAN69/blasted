// Task detail page: current result + live SSE progress + artifacts.

import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTask } from '../api.js'
import ArtifactViewer from './ArtifactViewer.jsx'
import TaskProgress from './TaskProgress.jsx'
import { EASE, EmptyState, ErrorState, Panel, Spinner } from './ui.jsx'

function taskMeta(id) {
  try {
    const all = JSON.parse(localStorage.getItem('brz.tasks') || '{}')
    return all[id] || {}
  } catch {
    return {}
  }
}

export default function TaskDetail() {
  const { id } = useParams()
  const reduce = useReducedMotion()
  const [initial, setInitial] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const meta = taskMeta(id)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getTask(id)
      .then((r) => {
        setInitial(r)
        setResult(r)
      })
      .catch((e) => setError(e))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleTerminal = useCallback((finalResult) => {
    setResult(finalResult)
  }, [])

  if (loading) {
    return (
      <Panel>
        <div className="flex items-center justify-center px-5 py-14">
          <Spinner label="Loading task…" />
        </div>
      </Panel>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorState message={error} onRetry={load} />
        <Link to="/" className="btn btn-secondary w-full sm:w-auto">
          ← Back to new task
        </Link>
      </div>
    )
  }

  if (!initial) {
    return (
      <Panel>
        <EmptyState title="Task not found">
          This task does not exist or has not been persisted.
        </EmptyState>
      </Panel>
    )
  }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="mx-auto max-w-3xl space-y-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow">{meta.mode || 'Task'}</div>
          <h1 className="mt-2.5 text-2xl font-bold tracking-tight">
            <span className="text-gradient">Task</span>{' '}
            <span className="font-mono text-base font-medium text-ink-3">{id.slice(0, 8)}</span>
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            {meta.created_at ? `Submitted ${new Date(meta.created_at).toLocaleString()}` : 'Submitted just now'}
          </p>
        </div>
        <Link to="/" className="btn btn-secondary hidden flex-none text-sm sm:inline-flex">
          ← New task
        </Link>
      </div>

      <TaskProgress taskId={id} initial={initial} onTerminal={handleTerminal} />

      <ArtifactViewer taskId={id} artifacts={result?.artifacts || initial.artifacts || []} />
    </motion.div>
  )
}

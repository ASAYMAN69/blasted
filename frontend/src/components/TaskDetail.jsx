// Task detail page: current result + live SSE progress + artifacts.

import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTask } from '../api.js'
import ArtifactViewer from './ArtifactViewer.jsx'
import TaskProgress from './TaskProgress.jsx'
import { Panel, EmptyState, ErrorState, Spinner } from './ui.jsx'

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
        <div className="flex items-center justify-center px-5 py-12">
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
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight">
            Task {meta.mode ? `${meta.mode}` : ''}
            <span className="ml-2 font-mono text-sm font-medium text-ink-3">{id.slice(0, 8)}</span>
          </h1>
          <p className="mt-0.5 text-sm text-ink-3">
            {meta.created_at ? `Submitted ${new Date(meta.created_at).toLocaleString()}` : 'Submitted just now'}
          </p>
        </div>
        <Link
          to="/"
          className="btn btn-secondary hidden flex-none text-sm sm:inline-flex"
        >
          ← New task
        </Link>
      </div>

      <TaskProgress taskId={id} initial={initial} onTerminal={handleTerminal} />

      <ArtifactViewer taskId={id} artifacts={result?.artifacts || initial.artifacts || []} />
    </div>
  )
}

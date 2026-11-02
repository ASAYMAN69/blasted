// Task detail page (TASK 07): GET /api/tasks/{id} for the current result, then
// TaskProgress consumes the SSE stream; artifacts + containment card render below.

import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTask } from '../api.js'
import ArtifactViewer from './ArtifactViewer.jsx'
import ContainmentCard from './ContainmentCard.jsx'
import TaskProgress from './TaskProgress.jsx'
import { Card, EmptyState, ErrorState, Spinner } from './ui.jsx'

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
      <Card>
        <div className="px-5 py-10 text-center">
          <Spinner label="Loading task…" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorState message={error} onRetry={load} />
        <p className="text-sm text-slate-500">
          <Link to="/" className="font-medium text-slate-900 underline underline-offset-2">
            Back to new task
          </Link>
        </p>
      </div>
    )
  }

  if (!initial) {
    return (
      <Card>
        <EmptyState title="Task not found">
          This task does not exist or has not been persisted.
        </EmptyState>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Task {meta.mode ? `${meta.mode} · ` : ''}
              <span className="font-mono">{id.slice(0, 8)}</span>
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {meta.created_at ? `Submitted ${new Date(meta.created_at).toLocaleString()}` : 'Submitted just now'}
            </p>
          </div>
          <Link
            to="/"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
          >
            ← New task
          </Link>
        </div>
      </Card>

      <TaskProgress taskId={id} initial={initial} onTerminal={handleTerminal} />

      <ArtifactViewer taskId={id} artifacts={result?.artifacts || initial.artifacts || []} />

      <ContainmentCard status={result?.status} attempts={result?.attempts} summary={result?.summary} />
    </div>
  )
}

// Live task progress via SSE (TASK 07). Consumes /api/tasks/{id}/events and
// renders status + attempt counter + latest summary. Closes the stream when a
// terminal state (passed/failed) arrives or on unmount.

import { useEffect, useRef, useState } from 'react'
import { taskEvents } from '../api.js'
import { Card, CardHeader, ErrorState, Spinner, StatusBadge } from './ui.jsx'

const TERMINAL = new Set(['passed', 'failed'])

export default function TaskProgress({ taskId, initial, onTerminal }) {
  const [result, setResult] = useState(initial || null)
  const [events, setEvents] = useState([])
  const [streamError, setStreamError] = useState(false)
  const [live, setLive] = useState(false)
  const onTerminalRef = useRef(onTerminal)
  onTerminalRef.current = onTerminal

  useEffect(() => {
    let disposed = false
    let stream

    stream = taskEvents(taskId, {
      onOpen: () => {
        if (!disposed) setLive(true)
      },
      onEvent: (ev) => {
        if (disposed) return
        setResult(ev)
        setEvents((prev) => [...prev.slice(-19), ev])
        if (TERMINAL.has(ev.status)) {
          setLive(false)
          onTerminalRef.current?.(ev)
          stream?.close()
        }
      },
      onError: () => {
        if (!disposed) setStreamError(true)
      },
    })

    return () => {
      disposed = true
      stream?.close()
    }
  }, [taskId])

  const status = result?.status || 'queued'
  const summaries = events.map((e) => e.summary).filter(Boolean)

  return (
    <Card aria-live="polite">
      <CardHeader
        title="Live progress"
        subtitle={live ? 'Streaming from the sandbox runner…' : 'Progress stream closed'}
        actions={<StatusBadge status={status} attempts={result?.attempts} />}
      />
      <div className="px-5 py-4">
        {streamError && !TERMINAL.has(status) ? (
          <ErrorState message="Progress stream disconnected. The run may still be in progress — refresh to re-check." />
        ) : null}

        {status === 'running' ? (
          <div className="mb-3">
            <Spinner label="Agent is planning, coding, executing…" />
          </div>
        ) : null}

        {summaries.length > 0 ? (
          <ol className="space-y-2">
            {summaries.map((s, i) => (
              <li key={i} className="rounded-md bg-slate-50 px-3 py-2 font-mono text-xs leading-relaxed text-slate-600">
                {s}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-500">No progress events yet.</p>
        )}
      </div>
    </Card>
  )
}

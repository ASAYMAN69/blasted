// Live task progress via SSE. Consumes /api/tasks/{id}/events and renders
// status + attempt counter + latest summary. Closes stream on terminal state.

import { useEffect, useRef, useState } from 'react'
import { taskEvents } from '../api.js'
import { Panel, PanelHeader, ErrorState, Spinner, StatusBadge, CodeBlock } from './ui.jsx'

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
    <Panel aria-live="polite">
      <PanelHeader
        title="Run progress"
        subtitle={live ? 'Streaming from the sandbox runner…' : 'Progress stream closed'}
        actions={<StatusBadge status={status} attempts={result?.attempts} />}
      />
      <div className="px-4 py-4 sm:px-5">
        {streamError && !TERMINAL.has(status) ? (
          <div className="mb-3">
            <ErrorState message="Progress stream disconnected. The run may still be in progress — refresh to re-check." />
          </div>
        ) : null}

        {status === 'running' ? (
          <div className="mb-3">
            <Spinner label="Agent is planning, coding, executing…" />
          </div>
        ) : null}

        {summaries.length > 0 ? (
          <ol className="space-y-2">
            {summaries.map((s, i) => (
              <li key={i}>
                <CodeBlock text={s} className="text-xs" />
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-ink-3">No progress events yet.</p>
        )}
      </div>
    </Panel>
  )
}

// Live task progress via SSE — animated status with starfield-like progress.
// Motion: status badge transitions, subtle pulse on running, log reveals.

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { taskEvents } from '../api.js'
import Markdown from './Markdown.jsx'
import { EASE, ErrorState, Panel, PanelHeader, Spinner, StatusBadge } from './ui.jsx'

const TERMINAL = new Set(['passed', 'failed'])

const STEPS = ['queued', 'running', 'passed', 'failed']

export default function TaskProgress({ taskId, initial, onTerminal }) {
  const reduce = useReducedMotion()
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
  const stepIndex = STEPS.indexOf(status)

  return (
    <Panel aria-live="polite">
      <PanelHeader
        title="Agent activity"
        subtitle={live ? 'Streaming from the sandbox runner…' : 'Progress stream closed'}
        actions={<StatusBadge status={status} attempts={result?.attempts} />}
      />
      <div className="px-5 py-5">
        {streamError && !TERMINAL.has(status) ? (
          <div className="mb-4">
            <ErrorState message="Progress stream disconnected. The run may still be in progress — refresh to re-check." />
          </div>
        ) : null}

        {/* Step indicator */}
        <div className="mb-5 flex items-center gap-1" aria-hidden="true">
          {STEPS.map((s, i) => {
            const isDone = i < stepIndex || (stepIndex === 3 && s === 'failed')
            const isCurrent = i === stepIndex
            return (
              <div key={s} className="flex flex-1 items-center gap-1">
                <motion.div
                  className={`h-1 flex-1  ${isDone ? 'bg-accent' : isCurrent ? 'bg-accent/60' : 'bg-surface-2'}`}
                  animate={isCurrent && !reduce ? { opacity: [0.5, 1, 0.5] } : undefined}
                  transition={isCurrent ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
                />
                {i < STEPS.length - 1 ? null : null}
              </div>
            )
          })}
        </div>
        <div className="-mt-3 mb-5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-ink-3">
          <span>Queued</span>
          <span>Working</span>
          <span className={status === 'passed' ? 'text-ok' : status === 'failed' ? 'text-danger' : ''}>
            {status === 'failed' ? 'Failed' : 'Done'}
          </span>
        </div>

        {status === 'running' ? (
          <div className="mb-4">
            <Spinner label="Agent is planning, coding, executing…" />
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {summaries.length > 0 ? (
            <motion.ol
              key="log"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-1.5"
            >
              {summaries.map((s, i) => (
                <motion.li
                  key={i}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="flex items-start gap-2.5 border border-line bg-bg-2 px-3 py-2"
                >
                  <span className="mt-0.5 flex-none font-mono text-[10px] uppercase tracking-wider text-ink-3">
                    attempt {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Markdown text={s.length > 600 ? `${s.slice(0, 600)}…` : s} size="sm" />
                  </div>
                </motion.li>
              ))}
            </motion.ol>
          ) : (
            <p className="text-sm text-ink-3">No progress events yet.</p>
          )}
        </AnimatePresence>
      </div>
    </Panel>
  )
}

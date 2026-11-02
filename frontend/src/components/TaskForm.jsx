// Task submission form — schema-driven, "Ethereal Glass" polish.
// Motion: staggered section reveals, animated mode switching, magnetic-ish submit.

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listModes, submitTask } from '../api.js'
import { EASE, ErrorState, Panel, Spinner } from './ui.jsx'

const FILE_KEYS = new Set(['file', 'data', 'test', 'code'])

const MODE_META = {
  csv: {
    label: 'CSV Analyst',
    glyph: 'C',
    blurb: 'Upload a CSV, ask a question in plain English. The agent writes pandas code, runs it in the sandbox, and returns real results.',
  },
  coder: {
    label: 'Code Reviewer',
    glyph: '{ }',
    blurb: 'Submit a Python file (optionally with a test). The agent runs it in the sandbox, diagnoses failures, applies fixes, and re-runs until green.',
  },
  chart: {
    label: 'Chart Anything',
    glyph: '◔',
    blurb: 'Give tabular data and a chart request. The agent generates a real chart in the sandbox — PNG or interactive HTML.',
  },
  fix: {
    label: 'File Fixer',
    glyph: '✎',
    blurb: 'Submit a file plus the behavior you want. The agent patches a copy, re-runs it, and returns a diff.',
  },
}

function UploadField({ id, value, onChange, placeholder, description }) {
  const fileRef = useRef(null)
  const [fileName, setFileName] = useState('')

  const handleFile = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        onChange(text)
        setFileName(file.name)
      } catch {
        setFileName('Could not read file')
      }
    },
    [onChange],
  )

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="btn btn-secondary text-sm"
        >
          <svg aria-hidden="true" className="h-4 w-4 text-ink-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          Choose file
        </button>
        <input
          ref={fileRef}
          type="file"
          onChange={handleFile}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
        <motion.span
          key={fileName}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="min-w-0 flex-1 truncate text-xs font-medium text-ink-2"
        >
          {fileName || 'or paste content below'}
        </motion.span>
      </div>
      <textarea
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        placeholder={placeholder}
        aria-describedby={description ? `${id}-desc` : undefined}
        className="field font-mono text-sm"
      />
      {description ? (
        <p id={`${id}-desc`} className="hint">{description}</p>
      ) : null}
    </div>
  )
}

export default function TaskForm() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [modes, setModes] = useState([])
  const [modesError, setModesError] = useState(null)
  const [loadingModes, setLoadingModes] = useState(true)
  const [mode, setMode] = useState('')
  const [inputs, setInputs] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let alive = true
    listModes()
      .then((data) => {
        if (!alive) return
        const m = Array.isArray(data) ? data : []
        setModes(m)
        if (m.length > 0) {
          setMode((cur) => (cur && m.some((x) => x.name === cur) ? cur : m[0].name))
        }
      })
      .catch((err) => alive && setModesError(err))
      .finally(() => alive && setLoadingModes(false))
    return () => {
      alive = false
    }
  }, [])

  const schema = useMemo(() => {
    const found = modes.find((m) => m.name === mode)
    return found?.input_schema || { properties: {}, required: [] }
  }, [modes, mode])

  const required = useMemo(() => new Set(schema.required || []), [schema])

  useEffect(() => {
    setInputs({})
  }, [mode])

  const setField = useCallback((key, value) => {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSubmit = useCallback(async () => {
    setSubmitError(null)
    for (const key of required) {
      const v = inputs[key]
      if (v === undefined || v === null || String(v).trim() === '') {
        setSubmitError(`Please fill in the required field: ${key}`)
        return
      }
    }
    setSubmitting(true)
    try {
      const task = await submitTask(mode, inputs)
      try {
        const existing = JSON.parse(localStorage.getItem('brz.tasks') || '{}')
        existing[task.id] = {
          id: task.id,
          mode: task.mode,
          created_at: task.created_at,
          status: 'queued',
          attempts: 0,
        }
        localStorage.setItem('brz.tasks', JSON.stringify(existing))
      } catch {
        /* localStorage unavailable */
      }
      navigate(`/tasks/${task.id}`)
    } catch (err) {
      setSubmitError(err)
    } finally {
      setSubmitting(false)
    }
  }, [inputs, required, mode, navigate])

  const properties = Object.entries(schema.properties || {})
  const activeMeta = MODE_META[mode] || { label: mode, glyph: '◆', blurb: '' }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: reduce ? 0 : 0.06 },
    },
  }
  const item = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-3xl space-y-6 pb-24 lg:pb-0"
    >
      <motion.div variants={item}>
        <div className="eyebrow">Sandboxed execution</div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="text-gradient">New task</span>
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-ink-3">
          The agent plans, writes, and runs real code in an isolated sandbox — then we destroy the container.
        </p>
      </motion.div>

      <motion.div variants={item}>
        <Panel>
          <div className="space-y-5 px-5 py-5">
            {loadingModes ? (
              <div className="flex items-center justify-center py-10">
                <Spinner label="Loading modes…" />
              </div>
            ) : modesError ? (
              <ErrorState message={modesError} onRetry={() => window.location.reload()} />
            ) : modes.length === 0 ? (
              <ErrorState message="No modes are available from the backend." />
            ) : (
              <>
                {/* Mode selector — animated pills */}
                <div role="radiogroup" aria-label="Mode" className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {modes.map((m) => {
                      const meta = MODE_META[m.name] || { label: m.name, glyph: '◆' }
                      const active = mode === m.name
                      return (
                        <motion.button
                          key={m.name}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setMode(m.name)}
                          whileTap={{ scale: 0.97 }}
                          className={`relative flex flex-col items-start gap-1.5 rounded-2xl border px-3.5 py-3 text-left transition-colors duration-fast ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                            active
                              ? 'border-accent/40 bg-accent-soft'
                              : 'border-line bg-bg-2 hover:border-line-2 hover:bg-surface'
                          }`}
                        >
                          {active ? (
                            <motion.span
                              layoutId="mode-active"
                              className="absolute inset-0 -z-10 rounded-2xl border border-accent/30 bg-accent-soft"
                              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                            />
                          ) : null}
                          <span className={`font-display text-lg font-semibold ${active ? 'text-accent' : 'text-ink-2'}`}>
                            {meta.glyph}
                          </span>
                          <span className={`text-[13px] font-semibold ${active ? 'text-ink' : 'text-ink-2'}`}>
                            {meta.label}
                          </span>
                        </motion.button>
                      )
                    })}
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={mode}
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, y: -6 }}
                      transition={{ duration: 0.28, ease: EASE }}
                      className="text-sm leading-relaxed text-ink-3"
                    >
                      {activeMeta.blurb}
                    </motion.p>
                  </AnimatePresence>
                </div>

                {/* Dynamic fields */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode + properties.length}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="space-y-4"
                  >
                    {properties.map(([key, prop]) => {
                      const isFile = FILE_KEYS.has(key)
                      const isEnum = Array.isArray(prop.enum)
                      const label = prop.title || key
                      const placeholder = prop.placeholder || prop.description || key
                      const id = `field-${mode}-${key}`
                      if (isEnum) {
                        return (
                          <div key={key}>
                            <label htmlFor={id} className="label">
                              {label}
                              {required.has(key) ? <span className="text-danger"> *</span> : null}
                            </label>
                            <select id={id} value={inputs[key] ?? prop.default ?? prop.enum[0]} onChange={(e) => setField(key, e.target.value)} className="field">
                              {prop.enum.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        )
                      }
                      if (isFile) {
                        return (
                          <div key={key}>
                            <label htmlFor={id} className="label">
                              {label}
                              {required.has(key) ? <span className="text-danger"> *</span> : null}
                            </label>
                            <UploadField id={id} value={inputs[key]} onChange={(v) => setField(key, v)} placeholder={placeholder} description={prop.description} />
                          </div>
                        )
                      }
                      return (
                        <div key={key}>
                          <label htmlFor={id} className="label">
                            {label}
                            {required.has(key) ? <span className="text-danger"> *</span> : null}
                          </label>
                          <textarea
                            id={id}
                            value={inputs[key] ?? ''}
                            onChange={(e) => setField(key, e.target.value)}
                            rows={prop.title === 'Error' || prop.title === 'Desired behavior' ? 3 : 4}
                            placeholder={placeholder}
                            aria-describedby={prop.description ? `${id}-desc` : undefined}
                            className="field"
                          />
                          {prop.description ? <p id={`${id}-desc`} className="hint">{prop.description}</p> : null}
                        </div>
                      )
                    })}
                  </motion.div>
                </AnimatePresence>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-line px-5 py-4">
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || loadingModes || modes.length === 0}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="btn btn-primary flex-1 sm:flex-none sm:min-w-40"
            >
              {submitting ? <Spinner label="Submitting…" /> : (
                <>
                  Run in sandbox
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </motion.button>
            {submitError ? (
              <div className="min-w-0 flex-1">
                <ErrorState message={submitError} />
              </div>
            ) : null}
          </div>
        </Panel>
      </motion.div>

      <motion.p variants={item} className="px-1 text-xs leading-relaxed text-ink-3">
        Sandboxes enforce: no network, read-only filesystem, non-root user, resource limits, and teardown after every task.
      </motion.p>
    </motion.div>
  )
}

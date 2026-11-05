// Task submission form — mode-specific, user-friendly, "Ethereal Glass" polish.
//
// Design: each mode has a tailored form (not schema-driven) so inputs are
// clearly labeled with icons, help text, and examples. Motion: staggered
// reveals, magnetic submit, animated mode switching. All transform/opacity only.

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listModes, submitTask } from '../api.js'
import CsvPreview from './CsvPreview.jsx'
import { EXAMPLES } from '../examples.js'
import QuickActions from './QuickActions.jsx'
import { EASE, ErrorState, Panel, Spinner } from './ui.jsx'

const MODES = [
  {
    id: 'data-analyst',
    label: 'Data Analyst',
    glyph: '📊',
    blurb: 'Upload messy data → auto-profile, clean, analyze, chart, and report. Turns hours of Excel work into 30 seconds.',
    steps: ['Profile data', 'Clean & standardize', 'Analyze', 'Generate chart', 'Write report'],
    outputs: ['Cleaned CSV', 'Analysis summary', 'Chart (PNG)', 'Insights report'],
    fileKey: 'file',
    fileLabel: 'CSV or JSON data',
    filePlaceholder: 'Paste your CSV or JSON data here, or choose a file…',
    fileHint: 'Supports CSV and JSON. Up to 25MB.',
  },
  {
    id: 'data-pipeline',
    label: 'Data Pipeline',
    glyph: '🧹',
    blurb: 'Raw data → profile, clean, analyze, visualize, narrate. Full data science pipeline in one click.',
    steps: ['Profile', 'Clean', 'Analyze', 'Generate charts', 'Write insights'],
    outputs: ['Cleaned CSV', 'Analysis findings', '3 charts (PNG)', 'Insights report'],
    fileKey: 'file',
    fileLabel: 'CSV or JSON data',
    filePlaceholder: 'Paste your CSV or JSON data here, or choose a file…',
    fileHint: 'Supports CSV and JSON. Up to 25MB.',
  },
  {
    id: 'invoice-reconciler',
    label: 'Invoice Reconciler',
    glyph: '📄',
    blurb: 'Paste invoices + purchase orders → extract, match, flag discrepancies, generate reconciliation report.',
    steps: ['Extract text', 'Parse invoices', 'Reconcile vs POs', 'Generate report', 'Summarize'],
    outputs: ['Reconciliation report', 'Matched/unmatched lists', 'Discrepancy flags', 'Chart'],
    fileKey: 'documents',
    fileLabel: 'Invoice documents (text)',
    filePlaceholder: 'Paste invoice text here. Separate multiple invoices with ---DOCUMENT---',
    fileHint: 'Paste raw invoice text. Separate multiple with ---DOCUMENT---',
  },
  {
    id: 'research-synthesizer',
    label: 'Research Synthesizer',
    glyph: '🔍',
    blurb: 'Paste 3-5 sources → extract claims, cross-reference, detect contradictions → cited report.',
    steps: ['Process sources', 'Extract claims', 'Cross-reference', 'Generate report', 'Summarize'],
    outputs: ['Claims list', 'Agreements/contradictions', 'Confidence score', 'Cited report'],
    fileKey: 'sources',
    fileLabel: 'Source texts',
    filePlaceholder: 'Paste source texts here. Separate multiple with ---SOURCE---',
    fileHint: 'Paste 3-5 source texts. Separate with ---SOURCE---',
  },
  {
    id: 'incident-investigator',
    label: 'Incident Investigator',
    glyph: '🚨',
    blurb: 'Upload metrics + events → detect anomalies, find root cause, propose fix, verify → incident report.',
    steps: ['Profile metrics', 'Detect anomalies', 'Correlate events', 'Hypothesize root cause', 'Verify fix', 'Write report'],
    outputs: ['Anomaly list', 'Root cause hypothesis', 'Fix verification', 'Incident report'],
    fileKey: 'metrics',
    fileLabel: 'Metrics CSV (timestamp, error_rate, latency, cpu, memory)',
    filePlaceholder: 'Paste metrics CSV here (timestamp,error_rate,latency_ms,cpu_pct)',
    fileHint: 'Time-series metrics. Include a timestamp column.',
  },
]

function UploadField({ id, value, onChange, placeholder, description, label }) {
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
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-2">
          {fileName || 'or paste content below'}
        </span>
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
        // Show only the multi-step business agents (not legacy csv/coder/chart/fix).
        const vectors = m.filter((x) => !['csv', 'coder', 'chart', 'fix'].includes(x.name))
        const shown = vectors.length > 0 ? vectors : m
        setModes(shown)
        if (shown.length > 0) {
          setMode((cur) => (cur && shown.some((x) => x.name === cur) ? cur : shown[0].name))
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

  // Ctrl/Cmd+Enter submits from anywhere in the form.
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!submitting && !loadingModes && modes.length > 0) handleSubmit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSubmit, submitting, loadingModes, modes.length])

  const properties = Object.entries(schema.properties || {}).filter(
    ([key]) => !['palette', 'chart_type'].includes(key),
  )
  const activeMeta = MODES.find((m) => m.id === mode) || { label: mode, glyph: '◆', blurb: '' }
  const showVisual = mode === 'data-analyst' || mode === 'data-pipeline' || mode === 'incident-investigator'
  const visual = { palette: inputs.palette || 'aurora', chart_type: inputs.chart_type || 'auto' }
  const example = EXAMPLES[mode]

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
      {/* Hero */}
      <motion.div variants={item}>
        <div className="eyebrow">Sandboxed execution</div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="text-gradient">New task</span>
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-ink-3">
          Pick an agent, give it data, and watch it plan, run, and verify — all inside an isolated sandbox.
        </p>
      </motion.div>

      {/* Mode selector — horizontal scroll on mobile, grid on desktop */}
      <motion.div variants={item}>
        <Panel>
          <div className="px-5 py-5">
            {loadingModes ? (
              <div className="flex items-center justify-center py-10">
                <Spinner label="Loading agents…" />
              </div>
            ) : modesError ? (
              <ErrorState message={modesError} onRetry={() => window.location.reload()} />
            ) : modes.length === 0 ? (
              <ErrorState message="No agents are available from the backend." />
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="label">Choose an agent</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {modes.map((m) => {
                      const meta = MODES.find((x) => x.id === m.name) || { label: m.name, glyph: '◆', blurb: '' }
                      const active = mode === m.name
                      return (
                        <motion.button
                          key={m.name}
                          type="button"
                          onClick={() => setMode(m.name)}
                          whileTap={{ scale: 0.98 }}
                          className={`relative flex items-start gap-3 border px-4 py-3.5 text-left transition-colors duration-fast ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                            active
                              ? 'border-accent/50 bg-accent-soft'
                              : 'border-line bg-bg-2 hover:border-line-2 hover:bg-surface'
                          }`}
                        >
                          {active ? (
                            <motion.span
                              layoutId="mode-active"
                              className="absolute inset-0 -z-10 border border-accent/30 bg-accent-soft"
                              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                            />
                          ) : null}
                          <span className="text-2xl flex-none">{meta.glyph}</span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-semibold ${active ? 'text-ink' : 'text-ink-2'}`}>
                              {meta.label}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
                              {meta.blurb}
                            </p>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Active mode details */}
                {activeMeta && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={mode}
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, y: -6 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="border border-accent/20 bg-accent-soft/30 px-4 py-3"
                    >
                      <div className="flex flex-wrap gap-4 text-xs">
                        <div>
                          <span className="font-semibold text-ink-2">Pipeline: </span>
                          <span className="text-ink-3">{activeMeta.steps.join(' → ')}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-ink-2">You get: </span>
                          <span className="text-ink-3">{activeMeta.outputs.join(', ')}</span>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}

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
                          <div key={key} className="space-y-3">
                            <div>
                              <label htmlFor={id} className="label">
                                {label}
                                {required.has(key) ? <span className="text-danger"> *</span> : null}
                              </label>
                              <UploadField id={id} value={inputs[key]} onChange={(v) => setField(key, v)} placeholder={placeholder} description={prop.description} />
                            </div>
                            {mode === 'data-analyst' && key === 'file' ? (
                              <>
                                <CsvPreview csvText={inputs[key]} />
                                <QuickActions
                                  csvText={inputs[key]}
                                  disabled={submitting}
                                  onPick={(q) => setField('question', q)}
                                />
                              </>
                            ) : null}
                            {showVisual && key === (mode === 'data-analyst' ? 'file' : 'metrics') ? (
                              <VisualOptions
                                value={visual}
                                onChange={(v) => {
                                  setField('palette', v.palette)
                                  setField('chart_type', v.chart_type)
                                }}
                              />
                            ) : null}
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
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">
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
            {example ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => setInputs({ ...example.inputs })}
                className="btn btn-ghost text-sm"
                title="Fill the form with a working sample"
              >
                <svg aria-hidden="true" className="h-4 w-4 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Try example
              </button>
            ) : null}
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
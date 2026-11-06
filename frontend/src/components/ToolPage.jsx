// ToolPage — reusable dedicated page for each business agent.
// Each tool has its own route, tailored inputs, pipeline preview, and example.

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { listModes, submitTask } from '../api.js'
import DropZone from './DropZone.jsx'
import CsvPreview from './CsvPreview.jsx'
import QuickActions from './QuickActions.jsx'
import { EXAMPLES } from '../examples.js'
import { EASE, ErrorState, Icon, Panel, Spinner } from './ui.jsx'

// Tool metadata — what each tool DOES (not product descriptions)
const TOOLS = {
  'data-analyst': {
    name: 'Data Analyst',
    icon: 'chart',
    tagline: 'Turn messy data into clean insights in 30 seconds',
    description: 'Upload a CSV or JSON file. The agent profiles the data, cleans it (fixes dates, nulls, formats), runs analysis, generates charts, and writes a plain-English report — all in one pass.',
    useFor: ['Cleaning messy exports from Excel/CRM', 'Quick stats and charts without writing code', 'Spotting trends and outliers in tabular data', 'Producing a shareable report from raw data'],
    steps: ['Profile data', 'Clean & standardize', 'Analyze', 'Generate chart', 'Write report'],
    outputs: ['Cleaned dataset', 'Statistical summary', 'Chart (PNG)', 'Insights report'],
    inputs: [
      { key: 'file', label: 'Your data', type: 'file', placeholder: 'Paste CSV or JSON data here, or drag & drop a file…', hint: 'Supports CSV and JSON. Up to 25MB.', rows: 8 },
      { key: 'question', label: 'What do you want to know?', type: 'text', placeholder: 'e.g. What is the average revenue by region? Show it as a bar chart.', hint: 'Ask in plain English. The agent figures out the rest.', rows: 2 },
    ],
    visual: true,
  },
  'data-pipeline': {
    name: 'Data Pipeline',
    icon: 'pipeline',
    tagline: 'Raw data in, cleaned data + analysis + charts + insights out',
    description: 'Full data science pipeline in one click. The agent profiles your data, cleans it, runs exploratory analysis, generates multiple charts, and writes an insights report.',
    useFor: ['Exploratory analysis of a new dataset', 'Generating multiple charts in one run', 'End-to-end data science without setup', 'Insights report for stakeholders'],
    steps: ['Profile', 'Clean', 'Analyze', 'Generate charts', 'Write insights'],
    outputs: ['Cleaned CSV', 'Analysis findings', '3 charts (PNG)', 'Insights report'],
    inputs: [
      { key: 'file', label: 'Your data', type: 'file', placeholder: 'Paste CSV or JSON data here, or drag & drop a file…', hint: 'Supports CSV and JSON. Up to 25MB.', rows: 8 },
      { key: 'question', label: 'What do you want to analyze? (optional)', type: 'text', placeholder: 'e.g. Correlation between age and salary', hint: 'Leave blank for automatic exploratory analysis.', rows: 2 },
    ],
    visual: true,
  },
  'invoice-reconciler': {
    name: 'Invoice Reconciler',
    icon: 'document',
    tagline: 'Paste invoices + purchase orders → get a reconciliation report',
    description: 'Paste invoice text and your purchase order CSV. The agent extracts structured data from each invoice, matches them against POs, flags discrepancies, and generates a reconciliation report with charts.',
    useFor: ['Matching invoices to purchase orders', 'Flagging price/quantity discrepancies', 'Monthly AP reconciliation', 'Audit-ready reconciliation reports'],
    steps: ['Extract text', 'Parse invoices', 'Reconcile vs POs', 'Generate report', 'Summarize'],
    outputs: ['Reconciliation report', 'Matched/unmatched lists', 'Discrepancy flags', 'Chart'],
    inputs: [
      { key: 'documents', label: 'Invoice documents', type: 'text', placeholder: 'Paste invoice text here. Separate multiple invoices with ---DOCUMENT---', hint: 'Paste raw invoice text. Separate multiple with ---DOCUMENT---', rows: 10 },
      { key: 'purchase_orders', label: 'Purchase orders (CSV)', type: 'text', placeholder: 'vendor,po_number,amount\nAcme Corp,PO-001,1500.00', hint: 'CSV with vendor, po_number, amount columns.', rows: 6 },
    ],
    visual: true,
  },
  'research-synthesizer': {
    name: 'Research Synthesizer',
    icon: 'search',
    tagline: 'Paste 3-5 sources → get a cited research report with contradictions flagged',
    description: 'Paste source texts. The agent extracts key claims from each, cross-references them, detects agreements and contradictions, and writes a cited research report with confidence scores.',
    useFor: ['Comparing 3-5 articles or papers', 'Literature review synthesis', 'Detecting contradictions across sources', 'Cited research summaries'],
    steps: ['Process sources', 'Extract claims', 'Cross-reference', 'Generate report', 'Summarize'],
    outputs: ['Claims list', 'Agreements/contradictions', 'Confidence score', 'Cited report'],
    inputs: [
      { key: 'sources', label: 'Source texts', type: 'text', placeholder: 'Paste source texts here. Separate multiple with ---SOURCE---', hint: 'Paste 3-5 source texts. Separate with ---SOURCE---', rows: 12 },
      { key: 'topic', label: 'Research topic (optional)', type: 'text', placeholder: 'e.g. Python vs JavaScript comparison', hint: 'What are you researching?', rows: 1 },
    ],
    visual: true,
  },
  'incident-investigator': {
    name: 'Incident Investigator',
    icon: 'alert',
    tagline: 'Upload metrics + events → get anomaly detection, root cause, and fix verification',
    description: 'Upload time-series metrics and event logs. The agent detects anomalies, correlates them with deploys/config changes, hypothesizes root cause, verifies a fix, and writes an incident report.',
    useFor: ['Post-incident root cause analysis', 'Correlating deploys with metric spikes', 'Anomaly detection in time-series', 'Generating incident reports'],
    steps: ['Profile metrics', 'Detect anomalies', 'Correlate events', 'Hypothesize root cause', 'Verify fix', 'Write report'],
    outputs: ['Anomaly list', 'Root cause hypothesis', 'Fix verification', 'Incident report'],
    inputs: [
      { key: 'metrics', label: 'Metrics CSV', type: 'file', placeholder: 'Paste metrics CSV here (timestamp,error_rate,latency_ms,cpu_pct)', hint: 'Time-series metrics. Include a timestamp column.', rows: 8 },
      { key: 'events', label: 'Events CSV (optional)', type: 'file', placeholder: 'timestamp,event_type,description\n2024-01-01 03:02,deploy,Deploy #42 changed DB pool', hint: 'Deploys, config changes, alerts. One per line.', rows: 6 },
    ],
    visual: true,
  },
}

// Mirrors backend PALETTES/CHART_KINDS.
export const PALETTES = {
  aurora: ['#7aa2f7', '#bb9af7', '#7dcfff', '#73daca', '#ff9e64', '#f7768e'],
  cobalt: ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
  emerald: ['#065f46', '#047857', '#059669', '#10b981', '#34d399', '#6ee7b7'],
  ember: ['#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#f97316', '#fb923c'],
  mono: ['#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db'],
}
export const CHART_KINDS = ['auto', 'bar', 'line', 'scatter', 'histogram', 'pie', 'box']

export default function ToolPage() {
  const navigate = useNavigate()
  const { toolId } = useParams()
  const reduce = useReducedMotion()
  const tool = TOOLS[toolId]

  const [modes, setModes] = useState([])
  const [inputs, setInputs] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [visual, setVisual] = useState({ palette: 'aurora', chart_type: 'auto' })
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    let alive = true
    const fetchModes = () => {
      listModes()
        .then((data) => {
          if (!alive) return
          setModes(Array.isArray(data) ? data : [])
        })
        .catch(() => {})
    }
    fetchModes()
    window.addEventListener('focus', fetchModes)
    return () => { alive = false; window.removeEventListener('focus', fetchModes) }
  }, [])

  // Auto-set palette/chart_type defaults
  useEffect(() => {
    setInputs((prev) => ({
      ...prev,
      palette: prev.palette || 'aurora',
      chart_type: prev.chart_type || 'auto',
    }))
  }, [])

  const handleSubmit = useCallback(async () => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const task = await submitTask(toolId, inputs)
      try {
        const existing = JSON.parse(localStorage.getItem('brz.tasks') || '{}')
        existing[task.id] = { id: task.id, mode: task.mode, created_at: task.created_at, status: 'queued', attempts: 0 }
        localStorage.setItem('brz.tasks', JSON.stringify(existing))
      } catch { /* ignore */ }
      navigate(`/tasks/${task.id}`)
    } catch (err) {
      setSubmitError(err)
    } finally {
      setSubmitting(false)
    }
  }, [inputs, toolId, navigate])

  // Ctrl/Cmd+Enter to submit
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!submitting) handleSubmit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSubmit, submitting])

  const setField = useCallback((key, value) => {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }, [])

  const example = EXAMPLES[toolId]

  const loadExample = useCallback(() => {
    if (example) setInputs({ ...example.inputs })
  }, [example])

  if (!tool) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Panel>
          <div className="px-5 py-10 text-center">
            <p className="text-ink-3">Unknown tool: {toolId}</p>
            <Link to="/" className="btn btn-secondary mt-4 text-sm">← Back to home</Link>
          </div>
        </Panel>
      </div>
    )
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: reduce ? 0 : 0.06 } },
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
      {/* Header */}
      <motion.div variants={item}>
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-3 transition-colors duration-fast ease-out hover:text-ink">
          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          All tools
        </Link>
        <div className="mt-3 flex items-start gap-4">
          <span className="flex h-12 w-12 flex-none items-center justify-center border border-accent/30 bg-accent-soft text-accent">
            <Icon name={tool.icon} className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              <span className="text-ink">{tool.name}</span>
            </h1>
            <p className="mt-1 text-[15px] text-ink-3">{tool.tagline}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            aria-label="What is this tool for?"
            title="What is this tool for?"
            className="flex h-9 w-9 flex-none items-center justify-center border border-line bg-surface text-ink-3 transition-colors duration-fast ease-out hover:border-accent/40 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="font-display text-base font-bold">?</span>
          </button>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2">{tool.description}</p>
      </motion.div>

      {/* Pipeline preview */}
      <motion.div variants={item}>
        <div className="border border-line bg-surface/40 px-5 py-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
            <Icon name="pipeline" className="h-3.5 w-3.5 text-accent" strokeWidth={1.6} />
            Pipeline
          </div>
          <ol className="mt-3 flex flex-wrap items-center gap-1.5">
            {tool.steps.map((step, i) => (
              <li key={step} className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-2">
                  <span className="font-mono text-[10px] text-accent/80">{String(i + 1).padStart(2, '0')}</span>
                  {step}
                </span>
                {i < tool.steps.length - 1 ? (
                  <Icon name="arrowRight" className="h-3 w-3 text-ink-3/60" strokeWidth={1.8} />
                ) : null}
              </li>
            ))}
          </ol>
          <div className="mt-4 flex items-start gap-2">
            <span className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-ink-3">You get</span>
            <div className="flex flex-wrap gap-1.5">
              {tool.outputs.map((out) => (
                <span key={out} className="inline-flex items-center gap-1 border border-accent/25 bg-accent-soft px-2 py-0.5 text-xs font-medium text-ink-2">
                  <span className="h-1 w-1 bg-accent" />
                  {out}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div variants={item}>
        <Panel>
          <div className="space-y-5 px-5 py-5">
            {tool.inputs.map((input) => {
              const id = `field-${toolId}-${input.key}`
              const isFile = input.type === 'file'
              return (
                <div key={input.key}>
                  <label htmlFor={id} className="label">
                    {input.label}
                    <span className="text-danger"> *</span>
                  </label>
                  {isFile ? (
                    <DropZone
                      id={id}
                      value={inputs[input.key]}
                      onChange={(v) => setField(input.key, v)}
                      placeholder={input.placeholder}
                      hint={input.hint}
                      rows={input.rows}
                    />
                  ) : (
                    <>
                      <textarea
                        id={id}
                        value={inputs[input.key] ?? ''}
                        onChange={(e) => setField(input.key, e.target.value)}
                        rows={input.rows}
                        placeholder={input.placeholder}
                        aria-describedby={input.hint ? `${id}-hint` : undefined}
                        className="field"
                      />
                      {input.hint ? <p id={`${id}-hint`} className="hint">{input.hint}</p> : null}
                    </>
                  )}
                  {toolId === 'data-analyst' && input.key === 'file' && inputs[input.key] ? (
                    <>
                      <CsvPreview csvText={inputs[input.key]} />
                      <QuickActions
                        csvText={inputs[input.key]}
                        disabled={submitting}
                        onPick={(q) => setField('question', q)}
                      />
                    </>
                  ) : null}
                </div>
              )
            })}

            {tool.visual ? (
              <div className="space-y-3 border border-line bg-bg-2 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink-2">
                  <svg aria-hidden="true" className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.57a116.143 116.143 0 0 1 5.043-5.569m0 0a15.998 15.998 0 0 0 3.428-2.15 4.5 4.5 0 0 0-6.855-1.632m3.428 3.782a15.998 15.998 0 0 0-3.428 2.15m0 0a116.143 116.143 0 0 0-5.043 5.569m0 0a15.998 15.998 0 0 0-3.428 2.15 4.5 4.5 0 0 0 6.855 1.632" />
                  </svg>
                  Chart styling
                </div>
                <div>
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-ink-3">Color palette</span>
                  <div role="radiogroup" aria-label="Color palette" className="flex flex-wrap gap-2">
                    {Object.entries(PALETTES).map(([name, hexes]) => {
                      const active = (inputs.palette || 'aurora') === name
                      return (
                        <button
                          key={name}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setField('palette', name)}
                          className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-xs font-medium transition-colors duration-fast ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                            active ? 'border-accent/50 bg-accent-soft text-ink' : 'border-line bg-surface text-ink-2 hover:border-line-2'
                          }`}
                        >
                          <span className="flex -space-x-1">
                            {hexes.map((h) => (
                              <span key={h} className="h-3 w-3 border border-ink/20" style={{ background: h }} />
                            ))}
                          </span>
                          {name}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-ink-3">Chart type</span>
                  <div role="radiogroup" aria-label="Chart type" className="flex flex-wrap gap-1.5">
                    {CHART_KINDS.map((kind) => {
                      const active = (inputs.chart_type || 'auto') === kind
                      return (
                        <button
                          key={kind}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setField('chart_type', kind)}
                          className={`border px-3 py-1.5 text-xs font-medium capitalize transition-colors duration-fast ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                            active ? 'border-accent/50 bg-accent-soft text-ink' : 'border-line bg-surface text-ink-2 hover:border-line-2'
                          }`}
                        >
                          {kind}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
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

      {/* Help modal */}
      <AnimatePresence>
        {showHelp ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 px-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`What ${tool.name} is for`}
              className="w-full max-w-lg border border-line bg-surface p-6 shadow-soft"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 flex-none items-center justify-center border border-accent/30 bg-accent-soft text-accent">
                    <Icon name={tool.icon} className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-semibold text-ink">{tool.name}</h2>
                    <p className="text-xs text-ink-3">{tool.tagline}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelp(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center text-ink-3 transition-colors duration-fast ease-out hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-ink-2">{tool.description}</p>

              <div className="mt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3">Use it for</h3>
                <ul className="mt-2 space-y-1.5">
                  {(tool.useFor || []).map((u) => (
                    <li key={u} className="flex items-start gap-2 text-sm text-ink-2">
                      <span className="mt-1.5 h-1 w-1 flex-none bg-accent" />
                      {u}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3">Pipeline</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-3">{tool.steps.join(' → ')}</p>
              </div>

              <div className="mt-5 flex justify-end">
                <button type="button" onClick={() => setShowHelp(false)} className="btn btn-secondary text-sm">
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}

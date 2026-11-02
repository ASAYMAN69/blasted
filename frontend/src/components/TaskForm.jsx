// Task submission form — schema-driven from GET /api/modes.
// Mobile-first: single column, 44px+ targets, sticky submit on small screens.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listModes, submitTask } from '../api.js'
import { Panel, ErrorState, Spinner } from './ui.jsx'

const FILE_KEYS = new Set(['file', 'data', 'test', 'code'])

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
          <svg aria-hidden="true" className="h-4 w-4 text-ink-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
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
        /* localStorage unavailable — history falls back gracefully */
      }
      navigate(`/tasks/${task.id}`)
    } catch (err) {
      setSubmitError(err)
    } finally {
      setSubmitting(false)
    }
  }, [inputs, required, mode, navigate])

  const properties = Object.entries(schema.properties || {})

  const modeMeta = {
    csv: { blurb: 'Upload a CSV, ask a question in plain English. The agent writes pandas code, runs it in the sandbox, and returns real results.' },
    coder: { blurb: 'Submit a Python file (optionally with a test). The agent runs it in the sandbox, diagnoses failures, applies fixes, and re-runs until green.' },
    chart: { blurb: 'Give tabular data and a chart request. The agent generates a real chart in the sandbox — PNG or interactive HTML.' },
    fix: { blurb: 'Submit a file plus the behavior you want. The agent patches a copy, re-runs it, and returns a diff.' },
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div>
        <h1 className="text-xl font-bold tracking-tight">New task</h1>
        <p className="mt-1 text-sm text-ink-3">
          The agent plans, writes, and runs real code in an isolated sandbox — then we destroy it.
        </p>
      </div>

      <Panel>
        <div className="space-y-5 px-4 py-5 sm:px-5">
          {loadingModes ? (
            <div className="flex items-center justify-center py-8">
              <Spinner label="Loading modes…" />
            </div>
          ) : modesError ? (
            <ErrorState message={modesError} onRetry={() => window.location.reload()} />
          ) : modes.length === 0 ? (
            <ErrorState message="No modes are available from the backend." />
          ) : (
            <>
              <div>
                <label htmlFor="mode" className="label">Mode</label>
                <select id="mode" value={mode} onChange={(e) => setMode(e.target.value)} className="field">
                  {modes.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <p className="hint">{modeMeta[mode]?.blurb}</p>
              </div>

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
            </>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-line px-4 py-3.5 sm:px-5">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loadingModes || modes.length === 0}
            className="btn btn-primary flex-1 sm:flex-none sm:min-w-36"
          >
            {submitting ? <Spinner label="Submitting…" /> : 'Submit task'}
          </button>
          {submitError ? (
            <div className="min-w-0 flex-1">
              <ErrorState message={submitError} />
            </div>
          ) : null}
        </div>
      </Panel>

      <p className="px-1 text-xs leading-relaxed text-ink-3">
        Sandboxes enforce: no network, read-only rootfs, non-root user, resource limits, and teardown after every task.
      </p>
    </div>
  )
}

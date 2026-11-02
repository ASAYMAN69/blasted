// Task submission form (TASK 07). Schema-driven from GET /api/modes.
// File-ish schema keys map to a file picker + editable textarea (content is a
// string in the API contract, e.g. csv.file -> input.csv).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listModes, submitTask } from '../api.js'
import { Card, ErrorState, Spinner } from './ui.jsx'

// Keys whose value is file content (upload or paste). Everything else is text.
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
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
            />
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
        {fileName ? (
          <span className="text-xs font-medium text-slate-600">{fileName}</span>
        ) : (
          <span className="text-xs text-slate-400">or paste content below</span>
        )}
      </div>
      <textarea
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        placeholder={placeholder}
        aria-describedby={description ? `${id}-desc` : undefined}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />
      {description ? (
        <p id={`${id}-desc`} className="text-xs text-slate-500">
          {description}
        </p>
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
    // Reset inputs when the mode changes (keep per-mode draft keyed by mode).
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
      // Persist locally for the history dashboard (no list endpoint yet).
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

  return (
    <div className="space-y-6">
      <Card>
        <div className="px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">New task</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Submit work for a disposable, isolated sandbox. The agent plans,
            writes, and runs real code — then we destroy the container.
          </p>
        </div>

        <div className="space-y-5 border-t border-slate-100 px-5 py-5">
          {loadingModes ? (
            <Spinner label="Loading modes…" />
          ) : modesError ? (
            <ErrorState message={modesError} onRetry={() => window.location.reload()} />
          ) : modes.length === 0 ? (
            <ErrorState message="No modes are available from the backend." />
          ) : (
            <>
              <div className="space-y-1.5">
                <label htmlFor="mode" className="block text-sm font-medium text-slate-700">
                  Mode
                </label>
                <select
                  id="mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:w-auto"
                >
                  {modes.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  {schema.description || `Mode “${mode}” — see the backend's input schema.`}
                </p>
              </div>

              {properties.map(([key, prop]) => {
                const isFile = FILE_KEYS.has(key)
                const isEnum = Array.isArray(prop.enum)
                const label = prop.title || key
                const placeholder = prop.placeholder || prop.description || key
                const id = `field-${mode}-${key}`
                if (isEnum) {
                  return (
                    <div key={key} className="space-y-1.5">
                      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
                        {label}
                        {required.has(key) ? <span className="text-rose-600"> *</span> : null}
                      </label>
                      <select
                        id={id}
                        value={inputs[key] ?? prop.default ?? prop.enum[0]}
                        onChange={(e) => setField(key, e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      >
                        {prop.enum.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                }
                if (isFile) {
                  return (
                    <div key={key} className="space-y-1.5">
                      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
                        {label}
                        {required.has(key) ? <span className="text-rose-600"> *</span> : null}
                      </label>
                      <UploadField
                        id={id}
                        value={inputs[key]}
                        onChange={(v) => setField(key, v)}
                        placeholder={placeholder}
                        description={prop.description}
                      />
                    </div>
                  )
                }
                return (
                  <div key={key} className="space-y-1.5">
                    <label htmlFor={id} className="block text-sm font-medium text-slate-700">
                      {label}
                      {required.has(key) ? <span className="text-rose-600"> *</span> : null}
                    </label>
                    <textarea
                      id={id}
                      value={inputs[key] ?? ''}
                      onChange={(e) => setField(key, e.target.value)}
                      rows={prop.title === 'Error' || prop.title === 'Desired behavior' ? 3 : 4}
                      placeholder={placeholder}
                      aria-describedby={prop.description ? `${id}-desc` : undefined}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                    {prop.description ? (
                      <p id={`${id}-desc`} className="text-xs text-slate-500">
                        {prop.description}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loadingModes || modes.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Spinner label="Submitting…" /> : 'Submit task'}
          </button>
          {submitError ? (
            <div className="min-w-0 flex-1">
              <ErrorState message={submitError} />
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  )
}

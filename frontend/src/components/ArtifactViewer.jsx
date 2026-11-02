// Artifact viewer (TASK 07). Renders the `artifacts` list from a RunResult by
// inferring kind from the filename/extension:
//   .png/.jpg/.jpeg/.gif/.webp/.svg -> <img>
//   .html / .htm                    -> iframe (plotly/notebook-style charts)
//   .json                           -> table if array of objects, else pretty JSON
//   .csv                            -> parsed table
//   .diff/.patch                    -> colored diff
//   everything else (logs, code)    -> monospace block
// Every artifact also gets a download link.

import { useEffect, useState } from 'react'
import { artifactUrl, fetchArtifactText } from '../api.js'
import { Card, CardHeader, CodeBlock, EmptyState, ErrorState, Spinner } from './ui.jsx'

const IMAGE_RE = /\.(png|jpe?g|gif|webp|svg|bmp)$/i
const HTML_RE = /\.(html?)$/i
const JSON_RE = /\.json$/i
const CSV_RE = /\.csv$/i
const DIFF_RE = /\.(diff|patch)$/i

function kindFor(name) {
  if (IMAGE_RE.test(name)) return 'image'
  if (HTML_RE.test(name)) return 'html'
  if (JSON_RE.test(name)) return 'json'
  if (CSV_RE.test(name)) return 'csv'
  if (DIFF_RE.test(name)) return 'diff'
  return 'text'
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

function DataTable({ rows }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Empty data file.</p>
  }
  const headers = rows[0]
  const body = rows.slice(1)
  const maxRows = 50
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead>
          <tr className="bg-slate-50 text-left">
            {headers.map((h, i) => (
              <th
                key={i}
                scope="col"
                className="px-3 py-2 font-medium text-slate-600"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {body.slice(0, maxRows).map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} className="px-3 py-2 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {body.length > maxRows ? (
        <p className="px-3 py-2 text-xs text-slate-400">
          Showing first {maxRows} of {body.length} rows.
        </p>
      ) : null}
    </div>
  )
}

function JsonView({ text }) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return <CodeBlock text={text} />
  }
  if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
    const headers = Array.from(new Set(parsed.flatMap((o) => Object.keys(o))))
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              {headers.map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-medium text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {parsed.map((row, r) => (
              <tr key={r}>
                {headers.map((h) => (
                  <td key={h} className="px-3 py-2 text-slate-700">
                    {typeof row[h] === 'object' && row[h] !== null
                      ? JSON.stringify(row[h])
                      : String(row[h] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return <CodeBlock text={JSON.stringify(parsed, null, 2)} />
}

function DiffView({ text }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-800">
      <pre className="bg-slate-950 px-4 py-3 font-mono text-xs leading-relaxed">
        {text.split('\n').map((line, i) => {
          let cls = 'text-slate-300'
          if (line.startsWith('+')) cls = 'bg-emerald-950/40 text-emerald-300'
          else if (line.startsWith('-')) cls = 'bg-rose-950/40 text-rose-300'
          else if (line.startsWith('@@')) cls = 'bg-blue-950/40 text-blue-300'
          return (
            <span key={i} className={`block ${cls}`}>
              {line || ' '}
            </span>
          )
        })}
      </pre>
    </div>
  )
}

function ArtifactPanel({ taskId, name }) {
  const kind = kindFor(name)
  const [text, setText] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const url = artifactUrl(taskId, name)

  useEffect(() => {
    let alive = true
    if (kind === 'image' || kind === 'html') {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    fetchArtifactText(taskId, name)
      .then((t) => alive && setText(t))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [taskId, name, kind])

  let body
  if (kind === 'image') {
    body = (
      <a href={url} target="_blank" rel="noreferrer">
        <img
          src={url}
          alt={`Artifact: ${name}`}
          className="max-h-96 w-full rounded-md border border-slate-200 object-contain bg-slate-50"
        />
      </a>
    )
  } else if (kind === 'html') {
    body = (
      <iframe
        src={url}
        title={`Artifact: ${name}`}
        className="h-96 w-full rounded-md border border-slate-200 bg-white"
        sandbox="allow-scripts allow-same-origin"
      />
    )
  } else if (loading) {
    body = <Spinner label="Loading artifact…" />
  } else if (error) {
    body = <ErrorState message={error} />
  } else if (kind === 'json') {
    body = <JsonView text={text} />
  } else if (kind === 'csv') {
    body = <DataTable rows={parseCsv(text)} />
  } else if (kind === 'diff') {
    body = <DiffView text={text} />
  } else {
    body = <CodeBlock text={text} />
  }

  return (
    <Card>
      <CardHeader
        title={name}
        subtitle={`${kind} artifact`}
        actions={
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
          >
            Download
          </a>
        }
      />
      <div className="px-5 py-4">{body}</div>
    </Card>
  )
}

export default function ArtifactViewer({ taskId, artifacts = [] }) {
  if (artifacts.length === 0) {
    return (
      <Card>
        <CardHeader title="Artifacts" subtitle="Files produced by the sandbox" />
        <EmptyState title="No artifacts yet">
          Artifacts appear after the sandbox run completes.
        </EmptyState>
      </Card>
    )
  }
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900">Artifacts</h2>
      {artifacts.map((name) => (
        <ArtifactPanel key={name} taskId={taskId} name={name} />
      ))}
    </div>
  )
}

// Artifact viewer — renders artifacts by inferred kind with hover-lift cards.
//
// Each artifact is fetched by name from the backend. Images/HTML are rendered
// directly (lazy-loaded by the browser); text artifacts (JSON/CSV/diff/code)
// are fetched as text and rendered appropriately. Diffs are sorted first
// because they're usually the "result" of a fix. Friendly labels (fix.diff ->
// "Patch (diff)") keep the UI readable.

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { artifactUrl, fetchArtifactText } from '../api.js'
import Markdown from './Markdown.jsx'
import { EASE, CodeBlock, EmptyState, ErrorState, Panel, PanelHeader, Spinner } from './ui.jsx'

const IMAGE_RE = /\.(png|jpe?g|gif|webp|svg|bmp)$/i
const HTML_RE = /\.(html?)$/i
const JSON_RE = /\.json$/i
const CSV_RE = /\.csv$/i
const DIFF_RE = /\.(diff|patch)$/i
const MD_RE = /\.(md|markdown)$/i

// Friendly display names for known artifact filenames.
const FRIENDLY = {
  'fix.diff': 'Patch (diff)',
  fixed_file: 'Resulting file',
  'chart.png': 'Chart',
  'chart.html': 'Chart (interactive)',
  'input.csv': 'Dataset',
  'summary.json': 'Structured result',
}

function displayName(name) {
  return FRIENDLY[name] || name
}

function looksLikeMarkdown(text) {
  if (!text || typeof text !== 'string') return false
  return /(^|\n)#{1,6}\s|(\*\*|__).+?(\*\*|__)|(^|\n)[-*+]\s|```/.test(text)
}

function kindFor(name) {
  if (IMAGE_RE.test(name)) return 'image'
  if (HTML_RE.test(name)) return 'html'
  if (MD_RE.test(name)) return 'markdown'
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
    return <p className="text-sm text-ink-3">Empty data file.</p>
  }
  const headers = rows[0]
  const body = rows.slice(1)
  const maxRows = 50
  return (
    <div className="overflow-x-auto  border border-line">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-bg-2 text-left">
            {headers.map((h, i) => (
              <th key={i} scope="col" className="px-3 py-2.5 font-semibold text-ink-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {body.slice(0, maxRows).map((row, r) => (
            <tr key={r} className="transition-colors duration-fast ease-out hover:bg-surface-2">
              {row.map((cell, c) => (
                <td key={c} className="px-3 py-2.5 text-ink-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {body.length > maxRows ? (
        <p className="px-3 py-2 text-xs text-ink-3">
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
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    // Single object → render as a key/value table.
    const entries = Object.entries(parsed)
    return (
      <div className="overflow-x-auto border border-line">
        <table className="min-w-full text-sm">
          <tbody className="divide-y divide-line">
            {entries.map(([k, v]) => (
              <tr key={k} className="transition-colors duration-fast ease-out hover:bg-surface-2">
                <th scope="row" className="border-r border-line bg-bg-2 px-3 py-2.5 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-2">
                  {k}
                </th>
                <td className="px-3 py-2.5 text-ink-2">
                  {typeof v === 'object' && v !== null ? (
                    <pre className="whitespace-pre-wrap font-mono text-xs text-ink-2">{JSON.stringify(v, null, 2)}</pre>
                  ) : (
                    String(v ?? '')
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
    const headers = Array.from(new Set(parsed.flatMap((o) => Object.keys(o))))
    return (
      <div className="overflow-x-auto  border border-line">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-bg-2 text-left">
              {headers.map((h) => (
                <th key={h} scope="col" className="px-3 py-2.5 font-semibold text-ink-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {parsed.map((row, r) => (
              <tr key={r} className="transition-colors duration-fast ease-out hover:bg-surface-2">
                {headers.map((h) => (
                  <td key={h} className="px-3 py-2.5 text-ink-2">
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
    <div className="overflow-x-auto  border border-code-bg">
      <pre className="bg-code-bg px-4 py-3 font-mono text-xs leading-relaxed">
        {text.split('\n').map((line, i) => {
          let cls = 'text-code-ink'
          if (line.startsWith('+')) cls = 'bg-ok/15 text-ok'
          else if (line.startsWith('-')) cls = 'bg-danger/15 text-danger'
          else if (line.startsWith('@@')) cls = 'bg-accent/15 text-accent'
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
  const reduce = useReducedMotion()
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
      <a href={url} target="_blank" rel="noreferrer" className="group block">
        <motion.img
          src={url}
          alt={`Artifact: ${name}`}
          whileHover={reduce ? undefined : { scale: 1.015 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="max-h-96 w-full  border border-line object-contain bg-bg-2"
        />
      </a>
    )
  } else if (kind === 'html') {
    body = (
      <iframe
        src={url}
        title={`Artifact: ${name}`}
        className="h-96 w-full  border border-line bg-white"
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
  } else if (kind === 'markdown' || looksLikeMarkdown(text)) {
    body = (
      <div className="px-1">
        <Markdown text={text} />
      </div>
    )
  } else {
    body = <CodeBlock text={text} />
  }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <Panel>
        <PanelHeader
          title={<span className="font-mono text-sm">{displayName(name)}</span>}
          subtitle={`${kind} artifact`}
          actions={
            <a href={url} target="_blank" rel="noreferrer" className="btn btn-secondary min-h-0 px-2.5 py-1.5 text-xs">
              Download
            </a>
          }
        />
        <div className="px-5 py-4">{body}</div>
      </Panel>
    </motion.div>
  )
}

export default function ArtifactViewer({ taskId, artifacts = [] }) {
  const reduce = useReducedMotion()
  if (artifacts.length === 0) {
    return (
      <Panel>
        <PanelHeader title="Artifacts" subtitle="Files produced by the sandbox" />
        <EmptyState title="No artifacts yet">
          Artifacts will show here.
        </EmptyState>
      </Panel>
    )
  }
  const ordered = [...artifacts].sort((a, b) => {
    // Diffs first (the result of a fix), then everything else alphabetically.
    const da = DIFF_RE.test(a) ? 0 : 1
    const db = DIFF_RE.test(b) ? 0 : 1
    return da - db || a.localeCompare(b)
  })
  return (
    <div className="space-y-4">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
      >
        <div className="eyebrow">Output</div>
        <h2 className="mt-2.5 text-xl font-bold tracking-tight">Artifacts</h2>
        <p className="mt-1 text-sm text-ink-3">Files produced by the sandbox run.</p>
      </motion.div>
      {ordered.map((name, i) => (
        <motion.div
          key={name}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: i * 0.06 }}
        >
          <ArtifactPanel taskId={taskId} name={name} />
        </motion.div>
      ))}
    </div>
  )
}

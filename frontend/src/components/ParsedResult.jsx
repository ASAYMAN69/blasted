// ParsedResult — renders the structured AI output (RunResult.parsed).
//
// Turns the JSON answer into a stat grid + data table instead of raw text.
// Coder-style verdicts render as a chip strip (runs cleanly / repair
// applied / tests passed / attempts) so the user sees the outcome at a
// glance. Markdown rendering handles any prose the model emits.
//
// Why parse on the backend: keeps the frontend dumb and consistent, and
// lets the same `parsed` object be reused by future consumers (exports,
// CLI, etc.) without re-parsing stdout.

import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useState } from 'react'
import Markdown from './Markdown.jsx'
import { EASE } from './ui.jsx'

function StatGrid({ numbers }) {
  const entries = Object.entries(numbers || {})
  if (entries.length === 0) return null
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {entries.map(([k, v], i) => (
        <motion.div
          key={k}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE, delay: i * 0.04 }}
          className="border border-line bg-bg-2 px-3.5 py-3"
        >
          <p className="truncate font-mono text-[10px] uppercase tracking-wider text-ink-3">{k}</p>
          <p className="mt-1 truncate font-display text-lg font-semibold text-ink">
            {typeof v === 'number' ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 }) : String(v)}
          </p>
        </motion.div>
      ))}
    </div>
  )
}

function ResultTable({ rows }) {
  if (!Array.isArray(rows) || rows.length === 0) return null
  const headers = Object.keys(rows[0])
  return (
    <div className="max-h-72 overflow-auto border border-line">
      <table className="min-w-max w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-surface-2">
            {headers.map((h) => (
              <th key={h} scope="col" className="border-b border-r border-line px-3 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-2 last:border-r-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, r) => (
            <tr key={r} className="transition-colors duration-fast ease-out hover:bg-surface-2">
              {headers.map((h) => (
                <td key={h} className="border-r border-line px-3 py-1.5 font-mono text-xs text-ink-2 last:border-r-0">
                  {typeof row[h] === 'object' && row[h] !== null ? JSON.stringify(row[h]) : String(row[h] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ParsedResult({ parsed, summary }) {
  const reduce = useReducedMotion()
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    const text = summary || parsed?.summary || ''
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    }).catch(() => {})
  }, [parsed, summary])
  if (!parsed || typeof parsed !== 'object') return null
  const { summary: ps, numbers, table, chart, ...rest } = parsed
  const hasStats = numbers && Object.keys(numbers).length > 0
  const hasTable = Array.isArray(table) && table.length > 0
  const extra = Object.entries(rest).filter(([k]) => !['summary', 'numbers', 'table', 'chart'].includes(k))
  const hasVerdict = 'run_ok' in rest || 'fixed' in rest || 'test_ok' in rest || 'changed' in rest

  if (!hasStats && !hasTable && !hasVerdict && extra.length === 0) return null

  const verdict = hasVerdict ? (
    <div className="flex flex-wrap gap-2">
      {'run_ok' in rest ? (
        <span className={`border px-3 py-1.5 text-xs font-semibold ${rest.run_ok ? 'border-ok/40 bg-ok-soft text-ok' : 'border-danger/40 bg-danger-soft text-danger'}`}>
          {rest.run_ok ? '✓ runs cleanly' : '✕ still failing'}
        </span>
      ) : null}
      {'fixed' in rest ? (
        <span className={`border px-3 py-1.5 text-xs font-semibold ${rest.fixed ? 'border-accent/40 bg-accent-soft text-accent' : 'border-line bg-surface-2 text-ink-2'}`}>
          {rest.fixed ? '✎ repair applied' : '— no repair needed'}
        </span>
      ) : null}
      {'changed' in rest ? (
        <span className={`border px-3 py-1.5 text-xs font-semibold ${rest.changed ? 'border-accent/40 bg-accent-soft text-accent' : 'border-line bg-surface-2 text-ink-2'}`}>
          {rest.changed ? '✎ patch applied' : '— no changes needed'}
        </span>
      ) : null}
      {typeof rest.diff_lines === 'number' ? (
        <span className="border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink-2">
          {rest.diff_lines} diff {rest.diff_lines === 1 ? 'line' : 'lines'}
        </span>
      ) : null}
      {'test_ok' in rest && rest.test_ok !== null ? (
        <span className={`border px-3 py-1.5 text-xs font-semibold ${rest.test_ok ? 'border-ok/40 bg-ok-soft text-ok' : 'border-danger/40 bg-danger-soft text-danger'}`}>
          {rest.test_ok ? '✓ tests passed' : '✕ tests failing'}
        </span>
      ) : null}
      {typeof rest.attempts === 'number' ? (
        <span className="border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink-2">
          {rest.attempts} {rest.attempts === 1 ? 'attempt' : 'attempts'}
        </span>
      ) : null}
    </div>
  ) : null

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="space-y-4"
    >
      {(ps || summary) ? (
        <div className="border border-line bg-bg-2 px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Summary</span>
            <button
              type="button"
              onClick={copy}
              className="font-mono text-[10px] uppercase tracking-wider text-ink-3 transition-colors duration-fast ease-out hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copied ? '✓ copied' : 'copy'}
            </button>
          </div>
          <Markdown text={ps || summary} />
        </div>
      ) : null}

      {verdict}

      {hasStats ? <StatGrid numbers={numbers} /> : null}
      {hasTable ? <ResultTable rows={table} /> : null}

      {extra.length > 0 ? (
        <div className="space-y-2">
          {extra.map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-3 border border-line bg-bg-2 px-4 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">{k}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-2">{typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </motion.div>
  )
}

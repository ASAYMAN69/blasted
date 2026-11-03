// CsvPreview — live table preview of the CSV content in CSV Analyst mode.
// Safe on overflow: horizontal scroll is contained in its own box, header row
// sticks, and rows are capped with a clear "showing X of Y" note.

import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { parseCsvRows } from '../csvHints.js'
import { EASE } from './ui.jsx'

const MAX_PREVIEW_ROWS = 100

export default function CsvPreview({ csvText }) {
  const reduce = useReducedMotion()
  const table = useMemo(() => {
    const text = String(csvText || '')
    if (!text.trim()) return null
    const rows = parseCsvRows(text)
    if (rows.length < 2) return null
    const headers = rows[0].map((h) => String(h).trim())
    const data = rows.slice(1)
    // Normalize ragged rows to the header width so the grid never breaks.
    const norm = data.map((r) => {
      const out = headers.map((_, i) => (r[i] === undefined ? '' : String(r[i])))
      return out
    })
    return {
      headers,
      rows: norm,
      total: data.length,
      shown: Math.min(data.length, MAX_PREVIEW_ROWS),
    }
  }, [csvText])

  if (!table) return null

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="overflow-hidden border border-line bg-bg-2"
    >
      {/* meta bar */}
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-3.5 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
          {table.headers.length} col{table.headers.length === 1 ? '' : 's'} · {table.total} row{table.total === 1 ? '' : 's'}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
          preview
        </span>
      </div>

      {/* scroll-safe table */}
      <div className="max-h-72 overflow-auto">
        <table className="min-w-max w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-2">
              {table.headers.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className="border-b border-r border-line px-3 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-2 last:border-r-0"
                >
                  {h || `col ${i + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {table.rows.slice(0, MAX_PREVIEW_ROWS).map((row, r) => (
              <tr key={r} className="transition-colors duration-fast ease-out hover:bg-surface-2">
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className="border-r border-line px-3 py-1.5 font-mono text-xs text-ink-2 last:border-r-0"
                  >
                    {cell === '' ? <span className="text-ink-3/50">—</span> : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {table.total > table.shown ? (
        <div className="border-t border-line bg-surface px-3.5 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-ink-3">
          showing {table.shown} of {table.total} rows — scroll the table to see all columns
        </div>
      ) : null}
    </motion.div>
  )
}

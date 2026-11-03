// QuickActions — contextual suggestions for CSV Analyst.
// Appears once CSV content is loaded; a tap fills the question field.

import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { buildCsvSuggestions, introspectCsv } from '../csvHints.js'
import { EASE } from './ui.jsx'

function SparkIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  )
}

export default function QuickActions({ csvText, onPick, disabled }) {
  const suggestions = useMemo(() => {
    if (!csvText || !String(csvText).trim()) return []
    const meta = introspectCsv(String(csvText))
    return buildCsvSuggestions(meta)
  }, [csvText])

  return (
    <AnimatePresence>
      {suggestions.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: EASE }}
          className=" border border-accent/20 bg-accent-soft/50 px-4 py-3"
        >
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-accent">
            <SparkIcon />
            Quick actions for your data
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <motion.button
                key={s.id}
                type="button"
                disabled={disabled}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, ease: EASE, delay: i * 0.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onPick(s.question)}
                className=" border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors duration-fast ease-out hover:border-accent/40 hover:bg-accent-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40"
              >
                {s.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

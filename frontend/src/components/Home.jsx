// Home — landing page with tool cards. Each card links to a dedicated tool page.

import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { EASE } from './ui.jsx'

const TOOLS = [
  {
    id: 'data-analyst',
    label: 'Data Analyst',
    glyph: '📊',
    blurb: 'Upload messy data → auto-profile, clean, analyze, chart, and report. Turns hours of Excel work into 30 seconds.',
    color: 'from-accent to-accent-2',
  },
  {
    id: 'data-pipeline',
    label: 'Data Pipeline',
    glyph: '🧹',
    blurb: 'Raw data → profile, clean, analyze, visualize, narrate. Full data science pipeline in one click.',
    color: 'from-accent to-accent-2',
  },
  {
    id: 'invoice-reconciler',
    label: 'Invoice Reconciler',
    glyph: '📄',
    blurb: 'Paste invoices + purchase orders → extract, match, flag discrepancies, generate reconciliation report.',
    color: 'from-accent to-accent-2',
  },
  {
    id: 'research-synthesizer',
    label: 'Research Synthesizer',
    glyph: '🔍',
    blurb: 'Paste 3-5 sources → extract claims, cross-reference, detect contradictions → cited report.',
    color: 'from-accent to-accent-2',
  },
  {
    id: 'incident-investigator',
    label: 'Incident Investigator',
    glyph: '🚨',
    blurb: 'Upload metrics + events → detect anomalies, find root cause, propose fix, verify → incident report.',
    color: 'from-accent to-accent-2',
  },
]

export default function Home() {
  const reduce = useReducedMotion()

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: reduce ? 0 : 0.07 } },
  }
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-5xl space-y-8 pb-24 lg:pb-0"
    >
      {/* Hero */}
      <motion.div variants={item}>
        <div className="eyebrow">Sandboxed execution</div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          <span className="text-gradient">AI agents that do real work</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-3">
          Pick an agent, give it data, and watch it plan, run, and verify — all inside an isolated sandbox.
          Every task executes in a disposable container with no network access. Blast radius: zero.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/history" className="btn btn-secondary text-sm">
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Run history
          </Link>
        </div>
      </motion.div>

      {/* Tool cards */}
      <motion.div variants={item}>
        <div className="eyebrow">Available agents</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool, i) => (
            <motion.div
              key={tool.id}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: i * 0.05 }}
            >
              <Link
                to={`/tools/${tool.id}`}
                className="group flex h-full flex-col border border-line bg-surface/60 p-5 transition-all duration-fast ease-out hover:border-accent/40 hover:bg-surface hover:shadow-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{tool.glyph}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-base font-semibold text-ink group-hover:text-accent transition-colors duration-fast ease-out">
                      {tool.label}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-ink-3">
                      {tool.blurb}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-accent">
                  Start
                  <svg aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-fast ease-out group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* How it works */}
      <motion.div variants={item}>
        <div className="eyebrow">How it works</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { step: '1', title: 'Pick an agent', desc: 'Choose from 5 business-value agents, each with a tailored pipeline.' },
            { step: '2', title: 'Give it data', desc: 'Upload a file or paste data. The agent auto-detects format and suggests questions.' },
            { step: '3', title: 'Get results', desc: 'Watch live progress. Get stats, charts, reports — all verified in a sandbox.' },
          ].map((s, i) => (
            <motion.div
              key={s.step}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE, delay: 0.1 + i * 0.08 }}
              className="border border-line bg-surface/40 px-5 py-4"
            >
              <span className="font-mono text-2xl font-bold text-accent/60">{s.step}</span>
              <h3 className="mt-2 font-display text-sm font-semibold text-ink">{s.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-3">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Containment badge */}
      <motion.div variants={item} className="border border-line bg-surface/40 px-5 py-4">
        <div className="flex items-start gap-3">
          <svg aria-hidden="true" className="mt-0.5 h-5 w-5 flex-none text-ok" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-ink">Blast radius: zero</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
              Every task runs in an isolated Docker container. No network access, read-only filesystem, non-root user, resource limits, destroyed after every task. The agent never touches your host.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

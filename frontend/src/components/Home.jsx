// Home — landing page with tool cards. Each card links to a dedicated tool page.

import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { EASE, Icon } from './ui.jsx'

const TOOLS = [
  {
    id: 'data-analyst',
    label: 'Data Analyst',
    icon: 'chart',
    blurb: 'Upload messy data → auto-profile, clean, analyze, chart, and report. Turns hours of Excel work into 30 seconds.',
    featured: true,
  },
  {
    id: 'data-pipeline',
    label: 'Data Pipeline',
    icon: 'pipeline',
    blurb: 'Raw data → profile, clean, analyze, visualize, narrate. Full data science pipeline in one click.',
  },
  {
    id: 'invoice-reconciler',
    label: 'Invoice Reconciler',
    icon: 'document',
    blurb: 'Paste invoices + purchase orders → extract, match, flag discrepancies, generate reconciliation report.',
  },
  {
    id: 'research-synthesizer',
    label: 'Research Synthesizer',
    icon: 'search',
    blurb: 'Paste 3-5 sources → extract claims, cross-reference, detect contradictions → cited report.',
  },
  {
    id: 'incident-investigator',
    label: 'Incident Investigator',
    icon: 'alert',
    blurb: 'Upload metrics + events → detect anomalies, find root cause, propose fix, verify → incident report.',
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

  const featured = TOOLS.find((t) => t.featured)
  const rest = TOOLS.filter((t) => !t.featured)

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-5xl space-y-10 pb-24 lg:pb-0"
    >
      {/* Hero */}
      <motion.div variants={item} className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          AI agents that do real work
        </h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-ink-3">
          Pick an agent, give it data, and watch it plan, run, and verify — all inside an isolated sandbox.
          Every task executes in a disposable container with no network access. Blast radius: zero.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link to="/history" className="btn btn-secondary text-sm">
            <Icon name="history" className="h-4 w-4" />
            Run history
          </Link>
        </div>
      </motion.div>

      {/* Featured tool */}
      {featured ? (
        <motion.div variants={item}>
          <Link
            to={`/tools/${featured.id}`}
            className="group flex flex-col gap-4 border border-line bg-surface/60 p-6 transition-all duration-fast ease-out hover:border-accent/40 hover:bg-surface hover:shadow-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-row sm:items-center sm:gap-6"
          >
            <span className="flex h-12 w-12 flex-none items-center justify-center border border-accent/30 bg-accent-soft text-accent">
              <Icon name={featured.icon} className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">Start here</span>
              </div>
              <h2 className="mt-1 font-display text-xl font-semibold text-ink group-hover:text-accent transition-colors duration-fast ease-out">
                {featured.label}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-3">{featured.blurb}</p>
            </div>
            <span className="hidden flex-none items-center gap-1.5 text-sm font-semibold text-accent sm:inline-flex">
              Open
              <Icon name="arrowRight" className="h-4 w-4 transition-transform duration-fast ease-out group-hover:translate-x-1" />
            </span>
          </Link>
        </motion.div>
      ) : null}

      {/* Tool grid */}
      <motion.div variants={item}>
        <h2 className="font-display text-lg font-semibold text-ink">More agents</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rest.map((tool, i) => (
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
                  <span className="flex h-9 w-9 flex-none items-center justify-center border border-line bg-surface-2 text-ink-2">
                    <Icon name={tool.icon} className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-base font-semibold text-ink group-hover:text-accent transition-colors duration-fast ease-out">
                      {tool.label}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-ink-3">
                      {tool.blurb}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-accent">
                  Start
                  <Icon name="arrowRight" className="h-3.5 w-3.5 transition-transform duration-fast ease-out group-hover:translate-x-1" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* How it works */}
      <motion.div variants={item}>
        <h2 className="font-display text-lg font-semibold text-ink">How it works</h2>
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
          <Icon name="shield" className="mt-0.5 h-5 w-5 flex-none text-ok" strokeWidth={1.6} />
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
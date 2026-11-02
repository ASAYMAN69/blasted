// Containment summary — the "run card" evidence for Blast Radius Zero.
// Shows the guarantees the sandbox enforces plus per-run context.

import { Panel, PanelHeader } from './ui.jsx'

const GUARANTEES = [
  {
    title: 'Container destroyed after every task',
    detail: 'Force-removed on success, failure, or timeout — never outlives its task.',
  },
  {
    title: 'Non-root user',
    detail: 'Code runs as an unprivileged runner user, never as root.',
  },
  {
    title: 'Read-only filesystem',
    detail: 'Root filesystem is read-only; only /workspace is writable.',
  },
  {
    title: 'Resource limits',
    detail: 'Memory and CPU limits are enforced (e.g. 512m / 0.5 CPU).',
  },
  {
    title: 'Wall-clock timeout',
    detail: 'Runaway loops are killed after the timeout (default 60s).',
  },
  {
    title: 'No network',
    detail: 'Runs with --network none — no exfiltration path.',
  },
  {
    title: 'No secrets in sandbox',
    detail: 'LLM keys and host credentials never enter the container.',
  },
  {
    title: 'Bounded retries',
    detail: 'The agent retries at most 3 times, then explains honestly.',
  },
]

export default function ContainmentCard({ status, attempts, summary }) {
  return (
    <Panel>
      <PanelHeader
        title="Containment — Blast Radius Zero"
        subtitle={
          status
            ? `Run status: ${status}${typeof attempts === 'number' && attempts > 0 ? ` after ${attempts} attempt(s)` : ''}`
            : 'What the sandbox guarantees'
        }
      />
      <div className="px-4 py-4 sm:px-5">
        {summary ? (
          <p className="mb-4 rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm text-ink-2">
            {summary}
          </p>
        ) : null}
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {GUARANTEES.map((g) => (
            <li key={g.title} className="flex gap-3 rounded-xl border border-line p-3.5">
              <svg
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 flex-none text-ok"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-ink">{g.title}</p>
                <p className="text-xs leading-relaxed text-ink-3">{g.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}

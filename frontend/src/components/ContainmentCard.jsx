// Containment summary card (TASK 07) — the "run card" evidence for Blast
// Radius Zero. Shows the guarantees the sandbox enforces (from the frozen
// contract §3 / design §3.4) plus per-run context where available.

import { Card, CardHeader } from './ui.jsx'

const GUARANTEES = [
  {
    title: 'Container destroyed after every task',
    detail: 'The sandbox is force-removed on success, failure, or timeout — it never outlives its task.',
  },
  {
    title: 'Non-root user',
    detail: 'Code runs as an unprivileged `runner` user, never as root.',
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
    detail: 'Sandbox runs with --network none in v1 — no exfiltration.',
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
    <Card>
      <CardHeader
        title="Containment — Blast Radius Zero"
        subtitle={
          status
            ? `Run status: ${status}${typeof attempts === 'number' && attempts > 0 ? ` after ${attempts} attempt(s)` : ''}`
            : 'What the sandbox guarantees'
        }
      />
      <div className="px-5 py-4">
        {summary ? (
          <p className="mb-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {summary}
          </p>
        ) : null}
        <ul className="grid gap-3 sm:grid-cols-2">
          {GUARANTEES.map((g) => (
            <li key={g.title} className="flex gap-3 rounded-md border border-slate-200 p-3">
              <svg
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 flex-none text-emerald-600"
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
                <p className="text-sm font-medium text-slate-800">{g.title}</p>
                <p className="text-xs leading-relaxed text-slate-500">{g.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

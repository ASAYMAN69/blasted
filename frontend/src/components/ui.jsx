// Small shared UI primitives (TASK 07). Accessible, semantic, no AI-flavored
// gradients/shadows; status is never conveyed by color alone.

import { ApiError } from '../api.js'

export function Card({ children, className = '', as: Tag = 'section', ...rest }) {
  return (
    <Tag className={`rounded-lg border border-slate-200 bg-white ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

export function CardHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}

const BADGE_TONES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
}

export function Badge({ tone = 'slate', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE_TONES[tone] || BADGE_TONES.slate} ${className}`}
    >
      {children}
    </span>
  )
}

const STATUS_META = {
  queued: { tone: 'amber', label: 'Queued' },
  running: { tone: 'blue', label: 'Running' },
  passed: { tone: 'emerald', label: 'Passed' },
  failed: { tone: 'rose', label: 'Failed' },
}

export function StatusBadge({ status, attempts, maxAttempts = 3 }) {
  const meta = STATUS_META[status] || STATUS_META.queued
  return (
    <Badge tone={meta.tone}>
      <StatusDot status={status} />
      {meta.label}
      {typeof attempts === 'number' && attempts > 0
        ? ` · ${attempts}/${maxAttempts}`
        : ''}
    </Badge>
  )
}

export function StatusDot({ status }) {
  const cls =
    status === 'running'
      ? 'bg-blue-500 animate-pulse'
      : status === 'passed'
        ? 'bg-emerald-500'
        : status === 'failed'
          ? 'bg-rose-500'
          : 'bg-amber-400'
  return <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${cls}`} />
}

export function Spinner({ label = 'Working…' }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-500" role="status">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
      />
      {label}
    </span>
  )
}

export function ErrorState({ message, onRetry }) {
  const detail = message instanceof ApiError ? message.message : String(message || '')
  return (
    <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
      <p className="text-sm font-medium text-rose-800">
        {detail || 'Something went wrong.'}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}

export function EmptyState({ icon, title, children }) {
  return (
    <div className="px-5 py-10 text-center">
      {icon ? <div className="mx-auto mb-3 text-slate-300">{icon}</div> : null}
      <h3 className="text-sm font-medium text-slate-700">{title}</h3>
      {children ? <div className="mt-1 text-sm text-slate-500">{children}</div> : null}
    </div>
  )
}

export function CodeBlock({ text = '', className = '' }) {
  return (
    <pre
      className={`overflow-x-auto whitespace-pre bg-slate-950 px-4 py-3 font-mono text-xs leading-relaxed text-slate-100 ${className}`}
    >
      {text}
    </pre>
  )
}

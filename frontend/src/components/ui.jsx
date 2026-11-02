// Shared UI primitives — "Ethereal Glass" dark premium.
// Accessible: visible focus, status never color-only, aria-live regions.
// Motion: transform/opacity only, custom ease-out, reduced-motion aware.

import { motion, useReducedMotion } from 'framer-motion'
import { ApiError } from '../api.js'

export const EASE = [0.23, 1, 0.32, 1]

export function Panel({ children, className = '', as: Tag = 'section', ...rest }) {
  return (
    <Tag className={`panel ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

export function PanelHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 hairline-b">
      <div className="min-w-0">
        <h2 className="font-display text-[15px] font-semibold text-ink">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-none items-center gap-2">{actions}</div> : null}
    </div>
  )
}

const BADGE_TONES = {
  slate: 'bg-surface-2 text-ink-2 border-line-2',
  ok: 'bg-ok-soft text-ok border-ok/30',
  warn: 'bg-warn-soft text-warn border-warn/30',
  accent: 'bg-accent-soft text-accent border-accent/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
}

export function Badge({ tone = 'slate', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${BADGE_TONES[tone] || BADGE_TONES.slate} ${className}`}
    >
      {children}
    </span>
  )
}

const STATUS_META = {
  queued: { tone: 'warn', label: 'Queued' },
  running: { tone: 'accent', label: 'Running' },
  passed: { tone: 'ok', label: 'Passed' },
  failed: { tone: 'danger', label: 'Failed' },
}

export function StatusBadge({ status, attempts, maxAttempts = 3 }) {
  const meta = STATUS_META[status] || STATUS_META.queued
  return (
    <Badge tone={meta.tone}>
      <StatusDot status={status} />
      {meta.label}
      {typeof attempts === 'number' && attempts > 0 ? ` · ${attempts}/${maxAttempts}` : ''}
    </Badge>
  )
}

export function StatusDot({ status }) {
  const cls =
    status === 'running'
      ? 'bg-accent animate-pulse-glow'
      : status === 'passed'
        ? 'bg-ok'
        : status === 'failed'
          ? 'bg-danger'
          : 'bg-warn'
  return <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${cls}`} />
}

export function Spinner({ label = 'Working…' }) {
  const reduce = useReducedMotion()
  return (
    <motion.span
      className="inline-flex items-center gap-2 text-sm text-ink-2"
      role="status"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-line-2 border-t-accent"
      />
      {label}
    </motion.span>
  )
}

export function ErrorState({ message, onRetry }) {
  const detail = message instanceof ApiError ? message.message : String(message || '')
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3.5"
    >
      <div className="flex items-start gap-2.5">
        <svg aria-hidden="true" className="mt-0.5 h-5 w-5 flex-none text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <p className="min-w-0 flex-1 text-sm font-medium text-danger">{detail || 'Something went wrong.'}</p>
      </div>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn btn-secondary mt-3 min-h-0 py-1.5 text-sm">
          Retry
        </button>
      ) : null}
    </motion.div>
  )
}

export function EmptyState({ icon, title, children }) {
  return (
    <div className="px-5 py-12 text-center">
      {icon ? <div className="mx-auto mb-3 text-ink-3">{icon}</div> : null}
      <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
      {children ? <div className="mt-1 text-sm text-ink-3">{children}</div> : null}
    </div>
  )
}

export function CodeBlock({ text = '', className = '' }) {
  return (
    <pre
      className={`overflow-x-auto whitespace-pre rounded-2xl border border-line bg-code-bg px-4 py-3 font-mono text-xs leading-relaxed text-code-ink ${className}`}
    >
      {text}
    </pre>
  )
}

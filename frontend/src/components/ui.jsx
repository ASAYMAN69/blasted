// Shared UI primitives — "Ethereal Glass" dark premium.
// Accessible: visible focus, status never color-only, aria-live regions.
// Motion: transform/opacity only, custom ease-out, reduced-motion aware.
//
// Design rules (from the design skills):
//   - All corners are sharp (industrial-brutalist direction): no radius.
//   - Status is never conveyed by color alone — icon + label + badge.
//   - Press feedback is a tiny scale, never a layout shift.
//   - Focus rings use the accent color so keyboard users always see where
//     they are.

import { motion, useReducedMotion } from 'framer-motion'
import { ApiError } from '../api.js'

export const EASE = [0.23, 1, 0.32, 1]

// Shared SVG icons (stroke-based, 24x24 viewBox). Replaces emoji glyphs.
export const Icons = {
  bolt: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z',
  clock: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  chart: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  pipeline: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
  document: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
  search: 'm21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z',
  alert: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
  arrowRight: 'M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3',
  back: 'M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18',
  history: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  shield: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
}

export function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.6 }) {
  const d = Icons[name]
  if (!d) return null
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

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
      className={`inline-flex items-center gap-1.5  border px-2.5 py-1 text-xs font-semibold ${BADGE_TONES[tone] || BADGE_TONES.slate} ${className}`}
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
  const attemptLabel =
    typeof attempts === 'number' && attempts > 0
      ? ` · ${attempts} ${attempts === 1 ? 'attempt' : 'attempts'}`
      : ''
  return (
    <Badge tone={meta.tone}>
      <StatusDot status={status} />
      {meta.label}
      {attemptLabel}
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
  return <span aria-hidden="true" className={`h-1.5 w-1.5  ${cls}`} />
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
        className="h-4 w-4 animate-spin  border-2 border-line-2 border-t-accent"
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
      className=" border border-danger/30 bg-danger-soft px-4 py-3.5"
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
      className={`overflow-x-auto whitespace-pre  border border-line bg-code-bg px-4 py-3 font-mono text-xs leading-relaxed text-code-ink ${className}`}
    >
      {text}
    </pre>
  )
}

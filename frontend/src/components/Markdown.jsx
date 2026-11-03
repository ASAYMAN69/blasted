// Markdown — renders AI-produced text (summaries, verdicts, logs) as styled
// HTML via react-markdown + remark-gfm. Safe by default (no raw HTML passthrough).

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './ui.jsx'

function InlineCode({ children }) {
  return (
    <code className="border border-line bg-surface-2 px-1 py-0.5 font-mono text-[0.92em] text-ink">
      {children}
    </code>
  )
}

export default function Markdown({ text, size = 'sm' }) {
  if (!text) return null
  const base =
    size === 'sm'
      ? 'text-sm leading-relaxed text-ink-2'
      : 'text-base leading-relaxed text-ink-2'

  return (
    <div className={`markdown ${base}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ inline, children, className }) => {
            if (inline) return <InlineCode>{children}</InlineCode>
            return <CodeBlock text={String(children).replace(/\n$/, '')} className="my-2" />
          },
          ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          h1: ({ children }) => <h1 className="mb-2 font-display text-lg font-bold text-ink">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 font-display text-base font-bold text-ink">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 font-display text-sm font-bold text-ink">{children}</h3>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="font-medium text-accent underline underline-offset-2">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-2 border-l-2 border-accent/40 bg-surface-2 px-3 py-2 last:mb-0">{children}</blockquote>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto border border-line">
              <table className="min-w-max w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface-2">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-r border-line px-3 py-1.5 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-2 last:border-r-0">{children}</th>
          ),
          td: ({ children }) => <td className="border-r border-line px-3 py-1.5 font-mono text-xs text-ink-2 last:border-r-0">{children}</td>,
          hr: () => <hr className="my-3 border-line" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

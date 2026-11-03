// App shell — "Ethereal Glass" dark premium.
//
// Layout model:
//   - Desktop (lg+): a full-height glass side rail on the left (w-64) plus
//     a main column padded to match it (lg:pl-64). This keeps navigation
//     always visible instead of floating over content.
//   - Mobile (< lg): a sticky floating glass top bar + a bottom tab bar
//     with 44px+ touch targets (thumbs-first, safe-area aware).
//
// Why Framer Motion here: the entrance animations + the layoutId active-nav
// indicator are the only "delight" moments; everything else (hover, press)
// is CSS so it stays cheap. Reduced-motion is respected everywhere.
//
// The aurora background is position:fixed with pointer-events:none so it
// never causes scroll jank, and backdrop-blur is only on the sticky chrome
// (never on scrolling surfaces — that kills mobile perf).
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import TaskForm from './components/TaskForm.jsx'
import TaskDetail from './components/TaskDetail.jsx'
import HistoryDashboard from './components/HistoryDashboard.jsx'

const EASE = [0.23, 1, 0.32, 1]

const ICONS = {
  task: 'M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.5 14.5M14.25 3.104c.251.023.501.05.75.082M19.5 14.5l-1.914 1.914A2.25 2.25 0 0 1 15.996 17H8.004a2.25 2.25 0 0 1-1.59-.586L4.5 14.5m15 0v3.75A2.25 2.25 0 0 1 17.25 20.5h-10.5a2.25 2.25 0 0 1-2.25-2.25V14.5m0 0-1.914-1.914A2.25 2.25 0 0 1 2.25 11V8.25a2.25 2.25 0 0 1 2.25-2.25h4.5',
  history: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  bolt: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z',
}

function NavLinkItem({ to, icon, label, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group relative flex items-center gap-2.5 px-3.5 py-3 text-sm font-medium transition-colors duration-fast ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          isActive ? 'text-ink' : 'text-ink-2 hover:text-ink'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <motion.span
              layoutId="nav-active"
              className="absolute inset-0 -z-10 border border-accent/25 bg-accent-soft"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          ) : null}
          <svg aria-hidden="true" className="h-5 w-5 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function App() {
  const { pathname } = useLocation()
  const reduce = useReducedMotion()
  const inTask = pathname.startsWith('/tasks/')

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="aurora" aria-hidden="true" />

      {/* Desktop side rail — full-height, anchored, aligned with content */}
      <motion.aside
        initial={reduce ? false : { opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface/80 backdrop-blur-xl lg:flex"
      >
        <div className="px-5 pb-4 pt-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center bg-gradient-to-br from-accent to-accent-2">
              <svg aria-hidden="true" className="h-4.5 w-4.5 text-accent-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d={ICONS.bolt} />
              </svg>
            </span>
            <span className="font-display text-sm font-semibold tracking-tight">Blasted Studio</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3" aria-label="Primary">
          <NavLinkItem to="/" end icon={ICONS.task} label="New task" />
          <NavLinkItem to="/history" icon={ICONS.history} label="Run history" />
        </nav>

        <div className="border-t border-line px-5 py-4">
          <p className="text-xs leading-relaxed text-ink-3">
            Every task runs inside an isolated, disposable sandbox.
          </p>
          <p className="mt-2 font-mono text-[10px] text-ink-3/70">build {__GIT_SHA__}</p>
        </div>
      </motion.aside>

      {/* Main column — left padding matches sidebar width (w-64 = 16rem) */}
      <div className="flex min-h-dvh flex-1 flex-col lg:pl-64">
        {/* Mobile top bar — floating glass */}
        <motion.header
          initial={reduce ? false : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="sticky top-3 z-30 mx-3 mt-3 glass px-4 safe-top lg:hidden"
        >
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center bg-gradient-to-br from-accent to-accent-2">
                <svg aria-hidden="true" className="h-4.5 w-4.5 text-accent-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={ICONS.bolt} />
                </svg>
              </span>
              <span className="truncate font-display text-sm font-semibold tracking-tight">
                {inTask ? 'Task detail' : 'Blasted Studio'}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 border border-ok/30 bg-ok-soft px-2.5 py-1 text-[11px] font-semibold text-ok">
              <span aria-hidden="true" className="h-1.5 w-1.5 bg-ok" />
              sandboxed
            </span>
          </div>
        </motion.header>

        <main className="mx-auto w-full flex-1 px-4 py-6 sm:px-6 lg:max-w-5xl lg:py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.32, ease: EASE }}
            >
              <Routes>
                <Route path="/" element={<TaskForm />} />
                <Route path="/tasks/:id" element={<TaskDetail />} />
                <Route path="/history" element={<HistoryDashboard />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile floating tab bar */}
        <nav aria-label="Primary" className="fixed bottom-3 left-3 right-3 z-30 lg:hidden">
          <div className="mx-auto flex max-w-md items-stretch gap-1 glass p-1.5 safe-bottom">
            <NavLinkItem to="/" end icon={ICONS.task} label="New" />
            <NavLinkItem to="/history" icon={ICONS.history} label="History" />
          </div>
        </nav>
      </div>
    </div>
  )
}

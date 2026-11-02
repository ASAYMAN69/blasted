import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import TaskForm from './components/TaskForm.jsx'
import TaskDetail from './components/TaskDetail.jsx'
import HistoryDashboard from './components/HistoryDashboard.jsx'

const NavItem = ({ to, icon, label, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        isActive ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
      }`
    }
  >
    <svg aria-hidden="true" className="h-5 w-5 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
    </svg>
    <span>{label}</span>
  </NavLink>
)

const ICONS = {
  task: 'M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.5 14.5M14.25 3.104c.251.023.501.05.75.082M19.5 14.5l-1.914 1.914A2.25 2.25 0 0 1 15.996 17H8.004a2.25 2.25 0 0 1-1.59-.586L4.5 14.5m15 0v3.75A2.25 2.25 0 0 1 17.25 20.5h-10.5a2.25 2.25 0 0 1-2.25-2.25V14.5m0 0-1.914-1.914A2.25 2.25 0 0 1 2.25 11V8.25a2.25 2.25 0 0 1 2.25-2.25h4.5',
  history: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
}

export default function App() {
  const { pathname } = useLocation()
  const inTask = pathname.startsWith('/tasks/')

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Side rail — lg+ */}
      <aside className="hidden w-60 flex-none flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-line px-5">
          <span className="text-sm font-bold tracking-tight">Sandboxed Agent Studio</span>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Primary">
          <NavItem to="/" end icon={ICONS.task} label="New task" />
          <NavItem to="/history" icon={ICONS.history} label="Run history" />
        </nav>
        <div className="border-t border-line p-4">
          <p className="text-xs leading-relaxed text-ink-3">
            Every task executes inside an isolated, disposable sandbox on Vultr.
          </p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-dvh flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 border-b border-line bg-surface px-4 safe-top lg:hidden">
          <div className="flex h-14 items-center justify-between">
            <span className="truncate text-sm font-bold tracking-tight">
              {inTask ? 'Task detail' : 'Sandboxed Agent Studio'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-2.5 py-1 text-[11px] font-semibold text-ok">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ok" />
              sandboxed
            </span>
          </div>
        </header>

        <main className="mx-auto w-full flex-1 px-4 py-5 sm:px-6 lg:max-w-4xl lg:px-8 lg:py-8">
          <Routes>
            <Route path="/" element={<TaskForm />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/history" element={<HistoryDashboard />} />
          </Routes>
        </main>

        {/* Bottom tab bar — < lg */}
        <nav
          aria-label="Primary"
          className="sticky bottom-0 z-20 border-t border-line bg-surface lg:hidden"
        >
          <div className="mx-auto flex max-w-md items-stretch px-2 py-1.5 safe-bottom">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  isActive ? 'bg-accent-soft text-accent' : 'text-ink-2'
                }`
              }
            >
              <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d={ICONS.task} />
              </svg>
              New task
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  isActive ? 'bg-accent-soft text-accent' : 'text-ink-2'
                }`
              }
            >
              <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d={ICONS.history} />
              </svg>
              History
            </NavLink>
          </div>
        </nav>
      </div>
    </div>
  )
}

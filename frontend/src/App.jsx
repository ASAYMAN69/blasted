import { Route, Routes } from 'react-router-dom'
import TaskForm from './components/TaskForm.jsx'
import TaskDetail from './components/TaskDetail.jsx'
import HistoryDashboard from './components/HistoryDashboard.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-xl font-semibold">Sandboxed Agent Studio</h1>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Routes>
          <Route path="/" element={<TaskForm />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
          <Route path="/history" element={<HistoryDashboard />} />
        </Routes>
      </main>
    </div>
  )
}

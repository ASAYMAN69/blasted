import { useState } from 'react'

// TODO(TASK 07): mode selector + dynamic inputs per mode schema, submit via api.submitTask
export default function TaskForm() {
  const [mode, setMode] = useState('csv')
  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-medium">New task</h2>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className="rounded border px-3 py-2"
      >
        <option value="csv">CSV Analyst</option>
        <option value="coder">Code Reviewer</option>
        <option value="chart">Chart Anything</option>
        <option value="fix">File Fixer</option>
      </select>
      <p className="mt-4 text-sm text-slate-500">
        Task form under construction (TASK 07).
      </p>
    </section>
  )
}

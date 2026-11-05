// DropZone — drag-and-drop + click-to-upload + paste textarea for file content.
// Accepts a single file, reads it as text, and calls onChange with the content.
// Shows file name + size after load. Supports drag-over visual feedback.

import { useCallback, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { EASE } from './ui.jsx'

export default function DropZone({ id, value, onChange, placeholder, label, hint, rows = 8 }) {
  const reduce = useReducedMotion()
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')

  const readFile = useCallback(async (file) => {
    if (!file) return
    try {
      const text = await file.text()
      onChange(text)
      setFileName(`${file.name} · ${(file.size / 1024).toFixed(1)} KB`)
    } catch {
      setFileName('Could not read file')
    }
  }, [onChange])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) readFile(file)
  }, [readFile])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }, [])

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="label">{label}</label>
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        animate={dragging ? { scale: 1.01 } : { scale: 1 }}
        transition={{ duration: 0.15, ease: EASE }}
        className={`relative border-2 border-dashed px-4 py-6 text-center transition-colors duration-fast ease-out ${
          dragging
            ? 'border-accent bg-accent-soft/40'
            : 'border-line bg-bg-2 hover:border-line-2'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={(e) => readFile(e.target.files?.[0])}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
        <svg aria-hidden="true" className="mx-auto h-8 w-8 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
        <p className="mt-2 text-sm font-medium text-ink-2">
          {dragging ? 'Drop file here' : 'Drag & drop a file, or click to browse'}
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2 text-xs font-semibold text-accent underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Choose file
        </button>
        {fileName ? (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-xs font-medium text-ok"
          >
            ✓ {fileName}
          </motion.p>
        ) : null}
      </motion.div>
      <textarea
        id={id}
        value={value ?? ''}
        onChange={(e) => { onChange(e.target.value); setFileName('') }}
        rows={rows}
        placeholder={placeholder}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="field font-mono text-sm"
      />
      {hint ? <p id={`${id}-hint`} className="hint">{hint}</p> : null}
    </div>
  )
}

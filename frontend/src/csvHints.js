// Client-side CSV introspection + preview helpers.
// Lightweight: reads the header row + a sample of rows to classify columns,
// then fabricates contextual questions the CSV Analyst mode can answer.

export function parseCsvRows(text, maxRows = 1000) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length && rows.length <= maxRows; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    if (row.some((c) => c.trim() !== '')) rows.push(row)
  }
  return rows
}

function isNumeric(v) {
  if (v == null || String(v).trim() === '') return false
  return !Number.isNaN(Number(String(v).replace(/[$,%]/g, '')))
}

export function introspectCsv(text) {
  const rows = parseCsvRows(text || '')
  if (rows.length < 2) return null
  const headers = rows[0].map((h) => String(h).trim())
  const data = rows.slice(1).slice(0, 10)
  const numeric = []
  const categorical = []

  headers.forEach((h, idx) => {
    if (!h) return
    const values = data.map((r) => r[idx]).filter((v) => v !== undefined)
    const filled = values.filter((v) => String(v).trim() !== '')
    if (filled.length === 0) return
    const numericCount = filled.filter(isNumeric).length
    if (numericCount / filled.length >= 0.8) numeric.push(h)
    else categorical.push(h)
  })

  // Rank categorical columns by cardinality (fewer distinct values = better
  // grouping key for breakdowns/charts, e.g. 'region' > 'date').
  const rankedCategorical = categorical
    .map((h) => {
      const idx = headers.indexOf(h)
      const distinct = new Set(data.map((r) => r[idx]).filter((v) => v !== undefined && String(v).trim() !== ''))
      return { name: h, cardinality: distinct.size }
    })
    .sort((a, b) => a.cardinality - b.cardinality)
    .map((c) => c.name)

  return { headers, numeric, categorical: rankedCategorical }
}

export function buildCsvSuggestions(meta) {
  if (!meta) return []
  const { numeric, categorical } = meta
  const out = []

  // Summaries
  out.push({ id: 'summary', label: 'Summarize this dataset', question: 'Summarize this dataset: describe its rows, columns, and any notable patterns.' })

  // Numeric-only questions
  if (numeric.length >= 1) {
    out.push({
      id: 'avg-first',
      label: `Average of ${numeric[0]}`,
      question: `What is the average of the ${numeric[0]} column?`,
    })
    out.push({
      id: 'top-first',
      label: `Top rows by ${numeric[0]}`,
      question: `What are the top 5 rows by the ${numeric[0]} column?`,
    })
  }
  if (numeric.length >= 2) {
    out.push({
      id: 'corr',
      label: `Correlation: ${numeric[0]} vs ${numeric[1]}`,
      question: `What is the correlation between ${numeric[0]} and ${numeric[1]}?`,
    })
  }

  // Categorical × numeric breakdowns + chart
  if (categorical.length >= 1 && numeric.length >= 1) {
    out.push({
      id: 'breakdown',
      label: `Average ${numeric[0]} by ${categorical[0]}`,
      question: `What is the average ${numeric[0]} grouped by ${categorical[0]}? Show it as a bar chart.`,
    })
    out.push({
      id: 'chart-by',
      label: `Bar chart: ${numeric[0]} by ${categorical[0]}`,
      question: `Make a bar chart of ${numeric[0]} by ${categorical[0]}.`,
    })
  }
  if (categorical.length >= 1) {
    out.push({
      id: 'counts',
      label: `Counts per ${categorical[0]}`,
      question: `How many rows are there for each value of ${categorical[0]}?`,
    })
  }

  return out.slice(0, 5)
}

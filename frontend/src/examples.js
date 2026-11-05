// Examples — one-click sample data per mode so judges/users can see the app
// working without preparing their own input. Each example is self-contained
// and known to succeed on the free model, so demos never flake on bad data.

export const EXAMPLES = {
  'data-analyst': {
    label: 'Try example',
    inputs: {
      file: 'month,sales\nJan,120\nFeb,150\nMar,90\nApr,200\nMay,175\nJun,220\n',
      question: 'What is the average monthly sales? Show it as a bar chart.',
    },
  },
  'data-pipeline': {
    label: 'Try example',
    inputs: {
      file: 'name,age,salary,department\nAlice,30,88000,Engineering\nBob,25,72000,Sales\nCarol,35,95000,Engineering\nDave,28,81000,Marketing\nEve,32,67000,Sales\nFrank,40,110000,Engineering\nGrace,27,76000,Marketing\nHenry,45,125000,Engineering\n',
      question: 'What is the average salary by department?',
    },
  },
  'invoice-reconciler': {
    label: 'Try example',
    inputs: {
      documents: '---DOCUMENT---\nInvoice #001\nVendor: Acme Corp\nDate: 2024-01-15\nTotal: $1,500.00\nItems: Widget A x10 @ $100, Widget B x5 @ $100\n\n---DOCUMENT---\nInvoice #002\nVendor: Beta Inc\nDate: 2024-01-20\nTotal: $2,300.00\nItems: Service X x1 @ $2300\n\n---DOCUMENT---\nInvoice #003\nVendor: Acme Corp\nDate: 2024-01-25\nTotal: $800.00\nItems: Widget C x8 @ $100',
      purchase_orders: 'vendor,po_number,amount\nAcme Corp,PO-001,1500.00\nBeta Inc,PO-002,2300.00\nAcme Corp,PO-003,750.00\n',
    },
  },
  'incident-investigator': {
    label: 'Try example',
    inputs: {
      metrics: 'timestamp,error_rate,latency_ms,cpu_pct\n2024-01-01 03:00,0.02,120,45\n2024-01-01 03:05,0.03,125,47\n2024-01-01 03:10,0.02,118,44\n2024-01-01 03:15,0.45,890,92\n2024-01-01 03:20,0.52,920,95\n2024-01-01 03:25,0.38,850,90\n2024-01-01 03:30,0.15,400,70\n2024-01-01 03:35,0.05,200,55\n2024-01-01 03:40,0.03,130,48\n2024-01-01 03:45,0.02,122,46\n',
      events: 'timestamp,event_type,description\n2024-01-01 03:02,deploy,Deploy #42 changed DB connection pool size\n2024-01-01 03:14,alert,Error rate threshold exceeded\n2024-01-01 03:30,config,Reverted connection pool change\n',
    },
  },
  'research-synthesizer': {
    label: 'Try example',
    inputs: {
      sources: '---SOURCE---\nPython is a high-level, general-purpose programming language. Its design philosophy emphasizes code readability with the use of significant indentation. Python is dynamically typed and garbage-collected. It supports multiple programming paradigms, including structured, object-oriented, and functional programming.\n\n---SOURCE---\nJavaScript is a programming language that conforms to the ECMAScript specification. JavaScript is high-level, often just-in-time compiled, and multi-paradigm. It has curly-bracket syntax, dynamic typing, prototype-based object-orientation, and first-class functions.\n\n---SOURCE---\nPython was created by Guido van Rossum and first released in 1991. JavaScript was created by Brendan Eich in 1995. Both languages are now among the most popular programming languages in the world.',
      topic: 'Python vs JavaScript comparison',
    },
  },
}

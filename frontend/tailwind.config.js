/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'hsl(var(--canvas))',
        surface: 'hsl(var(--surface))',
        'surface-2': 'hsl(var(--surface-2))',
        ink: 'hsl(var(--ink))',
        'ink-2': 'hsl(var(--ink-2))',
        'ink-3': 'hsl(var(--ink-3))',
        line: 'hsl(var(--line))',
        'line-2': 'hsl(var(--line-2))',
        accent: 'hsl(var(--accent))',
        'accent-ink': 'hsl(var(--accent-ink))',
        'accent-soft': 'hsl(var(--accent-soft))',
        ok: 'hsl(var(--ok))',
        'ok-soft': 'hsl(var(--ok-soft))',
        warn: 'hsl(var(--warn))',
        'warn-soft': 'hsl(var(--warn-soft))',
        danger: 'hsl(var(--danger))',
        'danger-soft': 'hsl(var(--danger-soft))',
        'code-bg': 'hsl(var(--code-bg))',
        'code-ink': 'hsl(var(--code-ink))',
      },
      boxShadow: {
        'soft': '0 1px 2px hsl(var(--ink) / 0.04), 0 4px 16px hsl(var(--ink) / 0.05)',
      },
      borderRadius: {
        xl: '0.875rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out both',
      },
    },
  },
  plugins: [],
}

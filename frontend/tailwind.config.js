/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'hsl(var(--bg))',
        'bg-2': 'hsl(var(--bg-2))',
        surface: 'hsl(var(--surface))',
        'surface-2': 'hsl(var(--surface-2))',
        elev: 'hsl(var(--elev))',
        ink: 'hsl(var(--ink))',
        'ink-2': 'hsl(var(--ink-2))',
        'ink-3': 'hsl(var(--ink-3))',
        line: 'hsl(var(--line))',
        'line-2': 'hsl(var(--line-2))',
        accent: 'hsl(var(--accent))',
        'accent-2': 'hsl(var(--accent-2))',
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
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 12px 40px -12px hsl(var(--accent) / 0.45)',
        'glow-ok': '0 12px 40px -12px hsl(var(--ok) / 0.4)',
        soft: '0 8px 32px -16px hsl(var(--ink) / 0.25)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
        drawer: 'var(--ease-drawer)',
      },
      transitionDuration: {
        fast: 'var(--d-fast)',
        med: 'var(--d-med)',
        slow: 'var(--d-slow)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

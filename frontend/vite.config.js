import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Short commit SHA of the deployed build (surfaced in the UI so you can
// confirm exactly which revision is live).
let gitSha = 'dev'
try {
  gitSha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()
} catch {
  /* not a git checkout */
}

export default defineConfig({
  plugins: [react()],
  define: { __GIT_SHA__: JSON.stringify(gitSha) },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})

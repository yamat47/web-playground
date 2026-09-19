import { basename } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The directory name is the URL path the experiment is published under.
const name = basename(import.meta.dirname)

export default defineConfig({
  base: `/${name}/`,
  plugins: [react()],
  // Reachable from the host when the dev server runs inside the container.
  server: { host: true, port: 5173, strictPort: true },
})

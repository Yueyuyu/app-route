import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { applicationScanner, previewPort } from './tooling/vite/applicationScanner.ts'

export default defineConfig({
  plugins: [react(), applicationScanner()],
  server: { host: '127.0.0.1', port: previewPort, strictPort: true },
  preview: { host: '127.0.0.1', port: previewPort, strictPort: true },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { previewPort } from './tooling/vite/applicationScanner.ts'
import { applicationIcons } from './tooling/vite/applicationIcons.ts'
import { routingApi } from './tooling/vite/routingApi.ts'

export default defineConfig({
  plugins: [react(), applicationIcons(), routingApi()],
  server: { host: '127.0.0.1', port: previewPort, strictPort: true },
  preview: { host: '127.0.0.1', port: previewPort, strictPort: true },
})

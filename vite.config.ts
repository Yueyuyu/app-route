import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { previewPort } from './tooling/vite/applicationScanner.ts'
import { applicationIcons } from './tooling/vite/applicationIcons.ts'
import { routingApi } from './tooling/vite/routingApi.ts'
import { readBuildMetadata } from './tooling/buildMetadata.ts'

const buildInfo = readBuildMetadata(process.cwd())

export default defineConfig({
  build: { manifest: true },
  define: { __APP_BUILD_INFO__: JSON.stringify(buildInfo) },
  plugins: [react(), applicationIcons(), routingApi(), { name: 'app-route-build-info', generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'build-info.json', source: JSON.stringify(buildInfo, null, 2) })
  } }],
  server: { host: '127.0.0.1', port: previewPort, strictPort: true },
  preview: { host: '127.0.0.1', port: previewPort, strictPort: true },
})

import path from 'node:path'
import { execFileSync } from 'node:child_process'

// Windows PowerShell 5 可能继承 pwsh 7 的模块路径；不用 Expand-Archive 的自动模块加载。
export function extractWindowsTestCore(archive, directory, environment = process.env) {
  const destination = path.resolve(directory, 'mihomo.exe')
  const cleanEnvironment = Object.fromEntries(Object.entries(environment).filter(([key]) => key.toLowerCase() !== 'psmodulepath'))
  const command = "$ErrorActionPreference = 'Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; " +
    "$zip = [IO.Compression.ZipFile]::OpenRead($env:APPROUTE_TEST_ARCHIVE); try { " +
    "$files = @($zip.Entries | Where-Object { $_.Name -match '\\.exe$' }); " +
    "if ($files.Count -ne 1) { throw 'Expected exactly one test core executable.' }; " +
    "[IO.Compression.ZipFileExtensions]::ExtractToFile($files[0], $env:APPROUTE_TEST_CORE_FILE, $true) " +
    '} finally { $zip.Dispose() }'
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
    env: { ...cleanEnvironment, APPROUTE_TEST_ARCHIVE: path.resolve(archive), APPROUTE_TEST_CORE_FILE: destination }, windowsHide: true, stdio: 'pipe',
  })
  return destination
}

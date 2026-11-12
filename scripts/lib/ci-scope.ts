const documentationTools = new Set([
  'scripts/check-docs.mjs', 'scripts/generate-docs.mjs', 'scripts/prepare-docs-site.mjs',
  'scripts/sync-release-docs.mjs', 'scripts/lib/release-docs.mjs', 'tests/release-docs.test.mjs',
])

function documentationOnly(file: string): boolean {
  return /^(?:[^/]+\.md|LICENSE)$/.test(file) || /^\.github\/[^/]+\.md$/.test(file)
    || file.startsWith('docs/') || file.startsWith('.github/ISSUE_TEMPLATE/') || documentationTools.has(file)
}

/** 未知文件默认执行程序检查，只有明确的文档路径可以跳过；删除与重命名同样参与判断。 */
export function ciScope(files: string[], full = false) {
  const scope = { program: full, integration: full, ui: full, docs: full }
  for (const file of files) {
    if (documentationOnly(file)) { scope.docs = true; continue }
    scope.program = true
    if (/^(package(?:-lock)?\.json|\.github\/workflows\/|scripts\/(?:ci-scope\.mjs|lib\/ci-scope\.ts)|tests\/ciScope\.test\.ts|public\/brand\/)/.test(file)) scope.docs = true
    if (file.startsWith('tests/')) continue // 单元测试变更仍跑两端全部单元测试和应用构建。
    if (/^(src\/renderer\/|public\/|index\.html$|vite\.config\.|tooling\/vite\/)/.test(file)) { scope.ui = true; continue }
    if (/^src\/(core\/|main\/(adapters|platform|services|storage|recovery)\/)/.test(file)) { scope.integration = true; continue }
    scope.integration = true
    scope.ui = true
  }
  return scope
}

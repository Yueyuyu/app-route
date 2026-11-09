import { useEffect, useState } from 'react'
import { exampleApplications } from '../data/exampleApplications'
import type { Application, RouteMode } from '../types'
import { validProcessName } from '../types'

const storageKey = 'approute.draft.v1'

function readDraft(): Application[] {
  try {
    const draft = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (draft?.version !== 1 || !Array.isArray(draft.applications)) return exampleApplications
    const valid = draft.applications.every((app: Application) =>
      typeof app.id === 'string' && typeof app.name === 'string' && typeof app.category === 'string' &&
      ['rule', 'direct', 'proxy'].includes(app.mode) && ['example', 'scan', 'manual'].includes(app.source) &&
      Array.isArray(app.processes) && app.processes.length > 0 &&
      app.processes.every((name) => typeof name === 'string' && validProcessName(name)),
    )
    return valid ? draft.applications.map((app: Application) => app.source === 'example'
      ? { ...app, icon: exampleApplications.find((example) => example.id === app.id)?.icon ?? app.icon } : app) : exampleApplications
  } catch { return exampleApplications }
}

export function useApplicationDraft() {
  const [applications, setApplications] = useState<Application[]>(readDraft)
  const [saveError, setSaveError] = useState(false)
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, applications }))
      setSaveError(false)
    } catch { setSaveError(true) }
  }, [applications])

  function changeMode(ids: string[], mode: RouteMode) {
    setApplications((current) => current.map((app) => ids.includes(app.id) ? { ...app, mode } : app))
  }

  function saveApplication(application: Application) {
    setApplications((current) => current.some((app) => app.id === application.id)
      ? current.map((app) => app.id === application.id ? application : app)
      : [...current, application])
  }

  function addScannedApplications(incoming: Application[]) {
    setApplications((current) => {
      const next = [...current]
      for (const app of incoming) {
        const existing = next.findIndex((item) => item.processes[0].toLowerCase() === app.processes[0].toLowerCase())
        if (existing >= 0) next[existing] = { ...app, id: next[existing].id, mode: next[existing].mode }
        else next.push(app)
      }
      return next
    })
  }

  return { applications, saveError, changeMode, saveApplication, addScannedApplications,
    removeApplication: (id: string) => setApplications((current) => current.filter((app) => app.id !== id)) }
}

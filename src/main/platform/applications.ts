import type { Application } from '../../shared/application.ts'
import { scanApplications as scanWindows } from './windows/scanApplications.ts'
import { runningApplications as runningWindows } from './windows/runningApplications.ts'
import { resolveProcessFamily as resolveWindows, isDedicatedApplicationDirectory as dedicatedWindows } from './windows/processFamily.ts'
import { scanMacApplications, runningMacApplications, resolveMacProcessFamily } from './macos/applications.ts'
import { macApplicationBundle } from '../../shared/applicationIdentity.ts'

export const scanApplications = (script?: string) => process.platform === 'darwin' ? scanMacApplications() : scanWindows(script)
export const runningApplications = () => process.platform === 'darwin' ? runningMacApplications() : runningWindows()
export const resolveProcessFamily = (app: Application, previous: string[] = []) => process.platform === 'darwin' ? resolveMacProcessFamily(app, previous) : resolveWindows(app, previous)
export const isDedicatedApplicationDirectory = (value: string) => Boolean(macApplicationBundle(value)) || dedicatedWindows(value)

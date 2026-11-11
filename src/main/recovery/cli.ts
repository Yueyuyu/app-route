import { RoutingService } from '../services/routingService.ts'
import { watchTransaction } from './watchTransaction.ts'

async function main() {
  const service = new RoutingService()
  const command = process.argv[2]
  if (command === 'watch') {
    await watchTransaction(service, process.argv[3])
    return
  }
  if (command === 'doctor') { console.log(JSON.stringify(await service.diagnose(), null, 2)); return }
  if (command === 'recover') {
    console.log('AppRoute 离线恢复：正在停用本工具的专属分流并重新加载原有配置。')
    const result = await service.recoverAll()
    console.log(result.message)
    console.log(JSON.stringify(await service.diagnose(), null, 2))
    if (!result.restored) process.exitCode = 2
    return
  }
  console.log('用法：recovery.cjs recover | doctor')
}
main().catch(error => { console.error(error instanceof Error ? error.message : '恢复未完成'); process.exitCode = 1 })

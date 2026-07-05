/**
 * LoveFlowCode 模型服务器启动器
 * 在 CLI 启动前自动加载模型
 */
import { startModelServer, waitForModel } from './modelServer.js'
import { getGlobalConfig } from '../../utils/config.js'

/** 检查配置是否使用本地模型 */
function isUsingLocalModel(): boolean {
  const config = getGlobalConfig()
  const env = config?.env ?? {}
  return !!(
    env.CLAUDE_CODE_USE_OPENAI && env.OPENAI_BASE_URL?.includes('localhost')
  )
}

/** 启动模型服务器并等待就绪 */
export async function ensureModelServer(): Promise<boolean> {
  // 若配置不使用本地模型，跳过
  // 但在 LoveFlowCode 中默认启用
  if (!isUsingLocalModel()) {
    return false
  }

  try {
    // 先检测本地模型 API 是否已在运行
    const resp = await fetch('http://localhost:8002/v1/models', {
      signal: AbortSignal.timeout(2000),
    })
    if (resp.ok) {
      console.error('[LoveFlowCode] 本地模型服务器已在运行')
      return true
    }
  } catch {
    // 服务器未运行，启动它
  }

  console.error('[LoveFlowCode] 正在启动本地模型服务器...')
  const port = await startModelServer()
  console.error(`[LoveFlowCode] 服务器已启动，正在等待模型就绪...`)

  // 等待模型加载完成
  await waitForModel()
  return true
}

/**
 * LoveFlowCode 模型服务器启动桥接
 * 优先级: 1. 本地已有服务器  2. LM Studio  3. Python CPU 服务器
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

function getProjectRoot(): string {
  for (const p of [
    join(dirname(fileURLToPath(import.meta.url)), '..', '..'),
    join(dirname(fileURLToPath(import.meta.url)), '..'),
  ]) {
    if (existsSync(join(p.replace(/\\/g, '/'), 'package.json'))) return p
  }
  return join(dirname(fileURLToPath(import.meta.url)), '..', '..')
}

const PROJECT_ROOT = getProjectRoot()
const PYTHON = join(PROJECT_ROOT, '.env', 'Scripts', 'python.exe')
const SERVER_SCRIPT = join(PROJECT_ROOT, 'model-server', 'server.py')
const LM_STUDIO_EXE = 'D:\\LMStudio\\LM Studio\\LM Studio.exe'
const LOCAL_PORT = 8002
const LM_STUDIO_PORT = 1234

let serverProcess: ReturnType<typeof spawn> | null = null

async function checkPort(port: number): Promise<boolean> {
  try {
    return (
      await fetch(`http://localhost:${port}/v1/models`, {
        signal: AbortSignal.timeout(2000),
      })
    ).ok
  } catch {
    return false
  }
}

async function launchLMStudio(): Promise<boolean> {
  if (!existsSync(LM_STUDIO_EXE)) return false
  console.error('[LoveFlowCode] 正在启动 LM Studio...')
  spawn(LM_STUDIO_EXE, [], { detached: true, stdio: 'ignore' }).unref()
  // 等待最多 60 秒
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 1000))
    if (await checkPort(LM_STUDIO_PORT)) {
      console.error('[LoveFlowCode] LM Studio 已就绪 (GPU 加速)')
      return true
    }
  }
  return false
}

function startPythonServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!existsSync(PYTHON) || !existsSync(SERVER_SCRIPT)) {
      reject(new Error('Python 环境未就绪'))
      return
    }
    console.error('[LoveFlowCode] 启动 CPU 模式模型服务器...')
    serverProcess = spawn(PYTHON, [SERVER_SCRIPT], {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, LOVEFLOWCODE_PORT: String(LOCAL_PORT) },
    })
    serverProcess.on('error', (e: Error) => reject(e))
    let tries = 0
    const iv = setInterval(async () => {
      if (await checkPort(LOCAL_PORT)) {
        clearInterval(iv)
        resolve()
        return
      }
      if (++tries >= 120) {
        clearInterval(iv)
        reject(new Error('超时'))
      }
    }, 1000)
  })
}

/** 确保模型服务器可用，返回端口号 */
export async function ensureServer(): Promise<number> {
  if (await checkPort(LOCAL_PORT)) return LOCAL_PORT
  if (await checkPort(LM_STUDIO_PORT)) return LM_STUDIO_PORT
  if (await launchLMStudio()) return LM_STUDIO_PORT
  await startPythonServer()
  return LOCAL_PORT
}

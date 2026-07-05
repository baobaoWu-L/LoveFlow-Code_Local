#!/usr/bin/env node
/**
 * LoveFlowCode 模型服务器启动器
 * 自动检测 LM Studio 或启动本地 Python 服务器
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

const PYTHON = join(PROJECT_ROOT, '.env', 'Scripts', 'python.exe')
const SERVER_SCRIPT = join(PROJECT_ROOT, 'model-server', 'server.py')
const LM_STUDIO_EXE = 'D:\\LMStudio\\LM Studio\\LM Studio.exe'
const LOCAL_PORT = 8002
const LM_STUDIO_PORT = 1234

let serverProcess = null

async function checkPort(port) {
  try {
    const resp = await fetch(`http://localhost:${port}/v1/models`, {
      signal: AbortSignal.timeout(2000),
    })
    return resp.ok
  } catch {
    return false
  }
}

async function launchLMStudio() {
  if (!existsSync(LM_STUDIO_EXE)) return false
  console.error('[LoveFlowCode] 正在启动 LM Studio...')
  spawn(LM_STUDIO_EXE, [], { detached: true, stdio: 'ignore' }).unref()
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 1000))
    if (await checkPort(LM_STUDIO_PORT)) {
      console.error('[LoveFlowCode] LM Studio 已就绪')
      return true
    }
  }
  return false
}

function startPythonServer() {
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
    serverProcess.on('error', e => reject(e))
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

export async function ensureServer() {
  if (await checkPort(LOCAL_PORT)) return LOCAL_PORT
  if (await checkPort(LM_STUDIO_PORT)) return LM_STUDIO_PORT
  if (await launchLMStudio()) return LM_STUDIO_PORT
  await startPythonServer()
  return LOCAL_PORT
}

export function stopServer() {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
}

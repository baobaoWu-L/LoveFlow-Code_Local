/**
 * LoveFlowCode 训练数据收集器
 * 每次对话自动保存数据，用于模型微调
 * 数据格式：JSONL，与 OpenAI fine-tuning 格式兼容
 */
import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'

const DATA_DIR = join(homedir(), '.loveflowcode', 'training-data')
const CHAT_LOG_FILE = join(DATA_DIR, 'chat_log.jsonl')
const MESSAGES_FILE = join(DATA_DIR, 'messages.jsonl')

/** 确保数据目录存在 */
async function ensureDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true })
  }
}

/** 对话消息格式 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** 保存单条消息到训练数据 */
export async function saveMessage(msg: ChatMessage): Promise<void> {
  try {
    await ensureDir()
    const entry = JSON.stringify({
      ...msg,
      timestamp: new Date().toISOString(),
    })
    await appendFile(MESSAGES_FILE, entry + '\n', 'utf-8')
  } catch (err) {
    console.error('[LoveFlowCode] 保存训练数据失败:', err)
  }
}

/** 保存完整对话回合（用于 fine-tuning） */
export async function saveConversationTurn(
  messages: ChatMessage[],
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await ensureDir()
    const entry = JSON.stringify({
      messages,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    })
    await appendFile(CHAT_LOG_FILE, entry + '\n', 'utf-8')
  } catch (err) {
    console.error('[LoveFlowCode] 保存对话数据失败:', err)
  }
}

/** 获取训练数据目录路径 */
export function getTrainingDataDir(): string {
  return DATA_DIR
}

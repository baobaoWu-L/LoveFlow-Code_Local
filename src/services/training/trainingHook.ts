/**
 * LoveFlowCode 训练数据收集钩子
 * 在 AppState 消息更新时自动保存训练数据
 */
import { saveConversationTurn } from './trainingDataCollector.js'
import type { Message } from '../../types/message.js'

/** 监听消息完成事件，保存训练数据 */
export function handleMessageComplete(
  allMessages: Message[],
  metadata?: Record<string, unknown>,
): void {
  // 只保存有 user + assistant 的完整回合
  const trainMessages = allMessages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-20) // 最近 20 条
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content:
        typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    }))

  if (trainMessages.length < 2) return

  // 后台保存，不阻塞
  saveConversationTurn(trainMessages, {
    source: 'loveflowcode-cli',
    ...metadata,
  }).catch(() => {
    // 静默处理
  })
}

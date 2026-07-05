/**
 * LoveFlowCode 本地模型推理服务器
 * 使用 node-llama-cpp 加载 GGUF 模型，提供 OpenAI 兼容 API
 */
import { getLlama, type LlamaModel, type Token } from 'node-llama-cpp'
import { Hono } from 'hono'
import { stream } from 'hono/streaming'

const MODEL_PATH = 'D:\\LLM\\Qwen\\Negentropy-claude-opus-4.7-9B-Q8_0.gguf'
const SERVER_PORT = 8002
const CONTEXT_SIZE = 8192 // 8K 上下文窗口
const GPU_LAYERS = 20 // 3060 6GB VRAM 可卸载约 20 层

let model: LlamaModel | null = null
let server: ReturnType<typeof Bun.serve> | null = null

/** 获取或初始化模型 */
async function getModel(): Promise<LlamaModel> {
  if (model) return model

  console.error('[LoveFlowCode] 正在加载本地模型...')
  const llama = await getLlama()
  model = await llama.loadModel({
    modelPath: MODEL_PATH,
    gpuLayers: GPU_LAYERS,
  })
  console.error('[LoveFlowCode] 模型加载完成！')
  return model
}

/** 构建聊天模板提示词 */
function buildPrompt(
  messages: Array<{ role: string; content: string }>,
  systemPrompt?: string,
): string {
  const parts: string[] = []
  if (systemPrompt) {
    parts.push(`<|im_start|>system\n${systemPrompt}<|im_end|>`)
  }
  for (const msg of messages) {
    if (msg.role === 'system') {
      parts.push(`<|im_start|>system\n${msg.content}<|im_end|>`)
    } else if (msg.role === 'user') {
      parts.push(`<|im_start|>user\n${msg.content}<|im_end|>`)
    } else if (msg.role === 'assistant') {
      parts.push(`<|im_start|>assistant\n${msg.content}<|im_end|>`)
    }
  }
  parts.push('<|im_start|>assistant\n')
  return parts.join('\n')
}

/** 提取 reasoning 和最终回答 */
function extractThinkResponse(text: string): {
  reasoning_content: string
  content: string
} {
  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/)
  const reasoning = thinkMatch ? thinkMatch[1].trim() : ''
  const content = text.replace(/<think>[\s\S]*?<\/think>/, '').trim()
  return { reasoning_content: reasoning, content }
}

/** 创建 Hono app */
function createApp() {
  const app = new Hono()

  // 模型列表
  app.get('/v1/models', c => {
    return c.json({
      object: 'list',
      data: [
        {
          id: 'LoveFlow',
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: 'loveflowcode',
        },
      ],
    })
  })

  // Chat 补全（流式）
  app.post('/v1/chat/completions', async c => {
    const body = await c.req.json()
    const {
      messages = [],
      stream: isStream = false,
      max_tokens = 2048,
      temperature = 0.7,
    } = body

    const m = await getModel()
    const prompt = buildPrompt(messages)
    const context = await m.createContext({ contextSize: CONTEXT_SIZE })
    const sequence = context.getSequence()

    if (isStream) {
      // 流式响应
      c.header('Content-Type', 'text/event-stream')
      c.header('Cache-Control', 'no-cache')
      c.header('Connection', 'keep-alive')

      return stream(c, async stream => {
        const tokens: Array<string | Token> = []
        let fullText = ''

        await sequence.evaluate(prompt)

        for await (const token of sequence.iterate()) {
          const text = m.detokenize([token])
          fullText += text
          tokens.push(token)

          // 发送事件
          const event = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: 'LoveFlow',
            choices: [
              {
                index: 0,
                delta: { content: text },
                finish_reason: null,
              },
            ],
          }
          stream.write(`data: ${JSON.stringify(event)}\n\n`)

          if (tokens.length >= max_tokens) break
        }

        // 完成事件
        stream.write(
          `data: ${JSON.stringify({
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: 'LoveFlow',
            choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
          })}\n\n`,
        )
        stream.write('data: [DONE]\n\n')
      })
    }

    // 非流式响应
    const { reasoning_content, content } = extractThinkResponse(
      await m.prompt(prompt, { maxTokens: max_tokens }),
    )

    return c.json({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'LoveFlow',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content,
            reasoning_content,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    })
  })

  return app
}

/** 启动服务器 */
export async function startModelServer(): Promise<number> {
  if (server) return SERVER_PORT

  const app = createApp()
  // 预加载模型（后台启动）
  getModel().catch(err => {
    console.error('[LoveFlowCode] 模型加载失败:', err)
  })

  return new Promise(resolve => {
    server = Bun.serve({
      port: SERVER_PORT,
      fetch: app.fetch,
    })
    console.error(
      `[LoveFlowCode] 模型服务器已启动: http://localhost:${SERVER_PORT}`,
    )
    resolve(SERVER_PORT)
  })
}

/** 等待模型就绪 */
export async function waitForModel(): Promise<void> {
  const m = await getModel()
  if (!m) throw new Error('模型加载失败')
  console.error('[LoveFlowCode] 模型已就绪')
}

/** 停止服务器 */
export async function stopModelServer(): Promise<void> {
  if (model) {
    model = null
  }
  if (server) {
    server.stop()
    server = null
  }
}

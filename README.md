<p align="center">
  <img src="https://raw.githubusercontent.com/baobaoWu-L/LoveFlow-Code/main/images/LoveFlow.png" alt="LoveFlow" width="400"/>
</p>

<h1 align="center">LoveFlow-Code</h1>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/runtime-Bun-black?style=flat-square&logo=bun" alt="Bun"></a>
  <a href="#"><img src="https://img.shields.io/badge/Node-%E2%89%A518-success?style=flat-square&logo=node.js" alt="Node"></a>
  <a href="#"><img src="https://img.shields.io/badge/license-MIT-purple?style=flat-square" alt="MIT"></a>
</p>

<p align="center">
  <strong>终端 AI 编程助手 · 支持多模型 · 内置 60+ 工具</strong>
</p>

---

## 安装

```bash
# 方式一：npm 全局安装（推荐）
npm install -g loveflow-code
loveflow

# 方式二：从源码运行
git clone https://github.com/baobaoWu-L/LoveFlow-Code.git
cd loveflow-code
bun install && bun run build && npm install -g .
loveflow

# 开发模式
bun run dev
```

## 使用

```bash
# 启动交互式 CLI
loveflow

# 查看版本
loveflow --version

# 直接提问
loveflow "帮我写一个 React 组件"
```

## 功能

<p align="center">
  <img src="https://raw.githubusercontent.com/baobaoWu-L/LoveFlow-Code/main/images/code.png" alt="LoveFlow 代码示例" width="600"/>
</p>

- **多模型支持** — Anthropic / OpenAI / Gemini / Grok
- **60+ 内置工具** — 文件读写 / Shell 执行 / Agent 调度 / MCP 协议 / Web 搜索
- **插件系统** — 可安装社区插件扩展功能
- **MCP 协议** — 完整的 MCP 客户端和服务端
- **远程控制** — Remote Control Server 自托管
- **技能系统** — 内置 9 种技能（code-simplify、frontend-design 等）

## 多模型配置

| 提供商 | 环境变量 |
|--------|---------|
| Anthropic | `ANTHROPIC_API_KEY` |
| OpenAI 兼容 | `CLAUDE_CODE_USE_OPENAI=1` + `OPENAI_API_KEY` + `OPENAI_BASE_URL` |
| Gemini | `CLAUDE_CODE_USE_GEMINI=1` + `GEMINI_API_KEY` |
| Grok | `CLAUDE_CODE_USE_GROK=1` + `GROK_API_KEY` |

示例（使用 DeepSeek / Ollama）：
```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_API_KEY=sk-xxx
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL=deepseek-chat
loveflow
```

## 配置

配置文件位于 `~/.loveflow/settings.json`

```bash
# 自定义配置目录
export LOVEFLOW_CONFIG_DIR=~/.loveflow
```

## 项目结构

```
LoveFlow-Code/
├── .loveflow/      # 项目配置
├── src/            # 源码
├── packages/       # workspace 包
├── dist/           # 构建产物
└── images/         # 品牌资源
```

## 协议

MIT License

---

**来源项目**：本 Fork 基于 [Claude Code](https://github.com/anthropics/claude-code)（Anthropic 官方 CLI）和 [claude-code-best/claude-code](https://github.com/claude-code-best/claude-code) 社区增强版，并在其基础上进行 LoveFlow 主题定制与功能优化。

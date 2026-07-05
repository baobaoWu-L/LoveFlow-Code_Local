<p align="center">
  <img src="https://raw.githubusercontent.com/LoveBreaker/LoveFlow-Code_Local/main/images/LoveFlow.png" alt="LoveFlowCode" width="400"/>
</p>

<h1 align="center">LoveFlowCode</h1>

<p align="center">
  <strong>本地 AI 编程助手 · 基于本地大模型运行</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/runtime-Bun-black?style=flat-square&logo=bun" alt="Bun"></a>
  <a href="#"><img src="https://img.shields.io/badge/Node-%E2%89%A518-success?style=flat-square&logo=node.js" alt="Node"></a>
  <a href="#"><img src="https://img.shields.io/badge/license-MIT-purple?style=flat-square" alt="MIT"></a>
</p>

---

## 安装

```bash
# npm 全局安装
npm install -g loveflowcode
loveflowcode

# 从源码运行
git clone https://github.com/LoveBreaker/LoveFlow-Code_Local.git
cd LoveFlow-Code_Local
bun install && bun run build && npm install -g .
loveflowcode
```

## 使用

```bash
# 启动交互式 CLI（自动加载本地模型）
loveflowcode

# 查看版本
loveflowcode --version

# 直接提问
loveflowcode "帮我写一个 React 组件"
```

## 功能

- **本地大模型** — 使用本地 Qwen3.5-9B 模型，无需 API Key
- **60+ 内置工具** — 文件读写 / Shell 执行 / Agent 调度 / MCP 协议 / Web 搜索
- **自学习** — 每次对话自动收集训练数据，持续优化模型
- **插件系统** — 可安装社区插件扩展功能
- **MCP 协议** — 完整的 MCP 客户端和服务端

## 配置

配置文件位于 `~/.loveflowcode/settings.json`

```bash
# 自定义配置目录
export LOVEFLOWCODE_CONFIG_DIR=~/.loveflowcode
```

## 项目结构

```
LoveFlowCode/
├── .loveflowcode/   # 项目配置
├── src/             # 源码
├── packages/        # workspace 包
├── dist/            # 构建产物
├── images/          # 品牌资源
└── model-server/    # 本地模型推理服务
```

## 协议

MIT License

---

**来源项目**：本 Fork 基于 [Claude Code](https://github.com/anthropics/claude-code)（Anthropic 官方 CLI）和 [claude-code-best/claude-code](https://github.com/claude-code-best/claude-code) 社区增强版，在其基础上进行 LoveFlowCode 本地化定制。

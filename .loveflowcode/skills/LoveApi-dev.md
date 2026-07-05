# LoveAPI 开发技能规范

## 核心规则

你是一个负责维护 NewAPI / LoveAPI 项目的高级 Golang 全栈工程师。

所有回答必须：

* 使用中文
* 所有思考过程必须使用中文
* 所有代码注释必须使用中文
* 不允许输出英文思考过程
* 不允许偷懒省略步骤

---

# 项目目录规则

默认工作目录：

```bash
classic/
```

所有代码修改：

* 默认在 classic 目录内进行
* 不允许修改 default 目录
* 不允许修改 default 下任何文件
* 如果发现需求涉及 default，必须提示用户风险，而不是直接修改

---

# 开发规则

每次修改功能后，必须执行：

```bash
go build ./...
```

如果项目使用 docker：

```bash
docker compose restart
```

如果存在：

```bash
docker-compose.yml
```

则优先执行：

```bash
docker compose restart
```

---

# 修改代码后的强制检查

每次修改后必须：

1. 检查 Go 编译是否成功
2. 检查是否有语法错误
3. 检查 import 是否缺失
4. 检查 docker 是否成功重启
5. 检查接口是否可能受到影响
6. 检查前端 API 地址是否需要同步修改

---

# 输出规则

修改代码时必须：

* 明确告诉用户修改了哪些文件
* 告诉用户文件路径
* 告诉用户新增了什么功能
* 告诉用户删除了什么逻辑
* 告诉用户为什么这样修改

---

# 禁止行为

禁止：

* 修改 default 目录
* 跳过编译
* 跳过 docker 重启
* 不检查报错
* 使用伪代码敷衍
* 输出不完整代码
* 省略关键逻辑

---

# Docker 规则

如果检测到 docker 环境：

修改后自动执行：

```bash
docker compose restart
```

如果服务名明确：

```bash
docker compose restart backend
docker compose restart frontend
```

---

# Go 项目规则

Go 项目默认：

```bash
go build ./...
```

必要时执行：

```bash
go mod tidy
```

---

# 前端规则

如果前端为 Vue：

修改 API 后必须检查：

* axios 请求
* token 存储
* localStorage
* sessionStorage
* CORS
* Vite 代理配置

---

# Claude Code 行为规范

每次操作必须：

1. 先分析项目结构
2. 再修改代码
3. 再执行编译
4. 再执行 docker 重启
5. 最后汇报结果

不允许直接跳过步骤。

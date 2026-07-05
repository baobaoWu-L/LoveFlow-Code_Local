# AI Store 项目开发规范

## 三层架构规范

```
router/ → service/ → curd/ → models/
  HTTP     业务逻辑   数据库操作   ORM模型
```

### 1. curd/ 层（数据库操作）

- 所有 `select()`、`execute()`、`db.add()`、`db.commit()`、`db.refresh()`、`db.flush()`、`db.delete()` **必须**放在 `curd/` 目录下
- Service 层禁止出现任何 `self.db.xxx()` 调用
- 每个 curd 函数接收 `db: AsyncSession` 作为第一个参数
- curd 函数只做数据库 CRUD，不包含业务逻辑
- curd 函数名要清晰表明操作，如 `get_user_by_email`、`create_order_record`

### 2. service/ 层（业务逻辑）

- **必须写成 class 形式**，所有方法为 `async def`
- 只调用 curd 函数，不直接操作数据库
- 所有入参使用 Pydantic BaseModel request schema
- 所有返回值使用 Pydantic BaseModel response schema
- 负责：参数校验、权限检查、数据转换、业务编排
- **每个方法必须包在 try/except 中**，并记录日志

```python
import logging
from core.logger import setup_logger

logger = setup_logger(__name__)

class XxxService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def some_method(self, param: str) -> XxxResp:
        logger.info("some_method 开始: param=%s", param)
        try:
            result = await curd_xxx.func(self.db, param)
            logger.info("some_method 成功: result=%s", result)
            return result
        except Exception as e:
            logger.error("some_method 失败: error=%s", str(e))
            raise
```

### 3. api/ 层（HTTP 路由）

- 每个路由装饰器必须标注 `response_model=UnifiedResponse[XxxResp]`
- **方法体必须包在 try/except 中**，并记录日志
- 成功返回：`return success_response(data=result)`
- 失败返回：`return error_response("错误信息")`
- 不直接在 router 中处理数据库或业务逻辑

```python
import logging
from core.logger import setup_logger

logger = setup_logger(__name__)

@router.post("/xxx", response_model=UnifiedResponse[XxxResp])
async def xxx(req: XxxRequest, db: AsyncSession = Depends(get_db)):
    logger.info("/xxx 收到请求: param=%s", req.param)
    try:
        result = await service.xxx(db, req)
        logger.info("/xxx 处理成功: id=%s", result.id)
        return success_response(data=result)
    except Exception as e:
        logger.error("/xxx 处理失败: error=%s", str(e))
        return error_response(str(e))
```

### 统一响应格式

```python
class UnifiedResponse(BaseModel, Generic[T]):
    code: int = 0
    message: str = "success"
    data: T | None = None

def success_response(data=None, message="success") -> UnifiedResponse
def error_response(message="error", code=-1) -> UnifiedResponse
```

### 日志规范

- 使用 `core.logger.setup_logger(__name__)` 创建 logger
- **每步操作都要记录日志**：开始、成功、失败
- 日志记录关键参数（不记录密码）
- router 层日志格式：`/xxx 收到请求/处理成功/处理失败`
- service 层日志格式：`方法名 开始/成功/失败`

### 防御性编码要求

- 所有用户输入必须经过 Pydantic schema 校验
- 数据库密码必须 URL 编码（`quote_plus`）
- 所有 API 返回统一格式（code/message/data）
- 开发者申请必须检查包数 ≥ 10
- 下载必须检查配额
- 事务操作必须有 commit/rollback

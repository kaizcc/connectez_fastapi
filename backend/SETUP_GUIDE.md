# 📋 完整安装和配置指南

## 🎯 总览

这份指南将帮你从零开始配置FastAPI + Supabase项目，确保一切正常运行。

## 📋 前置要求

- Python 3.11+ 
- 已创建的Supabase项目
- Git (可选)

## 🔧 详细步骤

### 第一步：设置Supabase数据库

1. **登录Supabase控制台**
   - 访问 https://supabase.com
   - 登录你的账户
   - 选择你的项目

2. **执行数据库Schema**
   - 在Supabase控制台中，点击左侧菜单的 `SQL Editor`
   - 点击 `+ New query`
   - 复制项目根目录的 `schema.sql` 文件内容
   - 粘贴到编辑器中
   - 点击 `Run` 执行SQL

   ⚠️ **重要**: 这一步会创建所有必要的表、函数、触发器和安全策略

3. **验证数据库创建**
   - 点击左侧 `Table Editor`
   - 你应该能看到以下表已创建：
     - subscriptions
     - jobs
     - resumes
     - profiles
     - user_credits
     - user_credit_usage
     - user_activities
     - credit_codes
     - api_keys
     - resume_scores
     - form_records

### 第二步：获取Supabase配置信息

1. **获取Project URL**
   - 在Supabase控制台，点击 `Settings` (设置)
   - 点击 `API`
   - 复制 `Project URL`
   - 格式类似：`https://abcdefghijk.supabase.co`

2. **获取API Key**
   - 在同一个API页面
   - 复制 `anon public` 密钥
   - 这是一个很长的字符串

3. **获取数据库连接字符串**
   - 点击 `Settings` > `Database`
   - 找到 `Connection String` 部分
   - 选择 `URI` 标签
   - 复制连接字符串
   - 格式类似：`postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijk.supabase.co:5432/postgres`
   - **注意**: 需要将 `[YOUR-PASSWORD]` 替换为你在创建项目时设置的数据库密码

### 第三步：配置项目环境

1. **进入backend目录**
   ```bash
   cd backend
   ```

2. **创建环境变量文件**
   ```bash
   # 复制模板文件
   cp env_template.txt .env
   ```

3. **编辑.env文件**
   使用文本编辑器打开 `.env` 文件，填入你的配置：
   ```env
   # 替换为你的实际值
   SUPABASE_URL=https://你的项目ID.supabase.co
   SUPABASE_KEY=你的anon_public密钥
   SUPABASE_DB_STRING=postgresql://postgres:你的密码@db.你的项目ID.supabase.co:5432/postgres
   
   # 可选配置
   DEBUG=True
   LOG_LEVEL=INFO
   ```

### 第四步：使用 uv 管理项目依赖

#### 4.1 初始化项目环境

```bash
# 创建虚拟环境并安装所有依赖
uv sync
```

这个命令会：
- 读取 `pyproject.toml` 中的依赖配置
- 自动创建 `.venv` 虚拟环境
- 安装所有项目依赖和开发依赖
- 生成 `uv.lock` 文件锁定版本

#### 4.2 理解 uv 的项目结构

执行后你会看到：
- `.venv/` - 虚拟环境目录
- `uv.lock` - 依赖锁定文件（类似 package-lock.json）

#### 4.3 验证安装

```bash
# 检查虚拟环境状态
uv venv list

# 查看已安装的包
uv pip list
```

### 第五步：验证数据库连接

项目使用现有的 Supabase 数据库，无需进行数据库迁移。只需验证连接即可：

```bash
# 验证数据库连接
uv run python -c "
from sqlalchemy import create_engine, inspect
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('SUPABASE_DB_STRING'))

with engine.connect() as conn:
    inspector = inspect(engine)
    tables = inspector.get_table_names(schema='public')
    print(f'✅ 连接成功，现有表: {sorted(tables)}')
"
```

如果看到类似输出，说明连接成功：
```
✅ 连接成功，现有表: ['api_keys', 'credit_codes', 'form_records', 'jobs', 'profiles', 'resume_scores', 'resumes', 'subscriptions', 'user_activities', 'user_credit_usage', 'user_credits']
```

### 第六步：启动 FastAPI 应用

#### 6.1 基本启动

```bash
# 启动开发服务器
uv run uvicorn app.main:app --reload
```

**参数说明：**
- `app.main:app` - 模块路径和应用实例
- `--reload` - 代码更改时自动重启

#### 6.2 完整配置启动

```bash
# 完整配置的启动命令
uv run uvicorn app.main:app \
  --reload \
  --host 0.0.0.0 \
  --port 8000 \
  --log-level info
```

**参数解释：**
- `--host 0.0.0.0` - 允许外部访问
- `--port 8000` - 指定端口
- `--log-level info` - 设置日志级别

### 第七步：验证和测试应用

#### 7.1 访问 API 文档

启动成功后，访问以下地址：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **基础端点**: http://localhost:8000

#### 7.2 测试数据库连接

在 API 文档页面测试端点：
1. 展开任意一个 API 端点
2. 点击 "Try it out"
3. 执行请求查看响应

#### 7.3 查看启动日志

观察控制台输出，正常情况下你应该看到：
```
INFO:     Started server process [xxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## 🎓 uv 进阶使用指南

### 常用 uv 命令

#### 依赖管理
```bash
# 添加新的依赖包
uv add package-name

# 添加开发依赖
uv add --dev package-name

# 移除依赖
uv remove package-name

# 更新所有依赖
uv sync --upgrade

# 查看过期的包
uv pip list --outdated
```

#### 虚拟环境管理
```bash
# 查看虚拟环境信息
uv venv list

# 激活虚拟环境（手动方式）
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 停用虚拟环境
deactivate
```

#### 运行命令
```bash
# 在虚拟环境中运行任何 Python 命令
uv run python script.py

# 运行测试
uv run pytest

# 运行代码检查
uv run ruff check app/

# 运行测试
uv run pytest
```

### 学习要点和最佳实践

#### 💡 uv 的优势
- **速度**: 比 pip 快 10-100 倍
- **一致性**: `uv.lock` 确保团队环境一致
- **简洁**: 无需手动管理虚拟环境激活
- **现代**: 内置了很多现代 Python 开发的最佳实践

#### 🔧 开发工作流
1. **开始工作**: `uv sync` (确保依赖最新)
2. **添加功能**: 修改代码
3. **测试**: `uv run pytest` 
4. **检查代码**: `uv run ruff check app/`
5. **启动服务**: `uv run uvicorn app.main:app --reload`

## 🐛 故障排除和调试技巧

### 常见问题解决

#### 问题1: 数据库连接失败

**症状**: `connection to server failed` 或连接超时

**调试步骤**:
```bash
# 1. 验证环境变量加载
uv run python -c "import os; from dotenv import load_dotenv; load_dotenv(); print(os.getenv('SUPABASE_DB_STRING'))"

# 2. 测试数据库连接
uv run python -c "from sqlalchemy import create_engine; import os; from dotenv import load_dotenv; load_dotenv(); engine = create_engine(os.getenv('SUPABASE_DB_STRING')); print('Connection successful!') if engine.connect() else print('Failed')"
```

**常见原因**:
- `.env` 文件路径不正确
- 数据库密码包含特殊字符需要URL编码
- Supabase项目暂停或删除

#### 问题2: SQLModel 模型加载问题

**症状**: 模型导入失败或类型错误

**调试步骤**:
```bash
# 检查模型是否正确加载
uv run python -c "from app.db.models import *; print('Models loaded successfully')"

# 验证模型与数据库表的对应关系
uv run python -c "
from app.db.models import *
from sqlalchemy import inspect
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('SUPABASE_DB_STRING'))
inspector = inspect(engine)

print('数据库中的表:', inspector.get_table_names(schema='public'))
"
```

**解决方案**:
- 确保 `models.py` 中所有模型都正确定义
- 检查外键关系是否正确
- 验证表名和字段名是否与 Supabase 中的一致

#### 问题3: FastAPI 启动失败

**症状**: 导入错误或服务无法启动

**调试步骤**:
```bash
# 检查 Python 路径和模块导入
uv run python -c "import app.main; print('App imported successfully')"

# 详细错误信息启动
uv run uvicorn app.main:app --reload --log-level debug
```

### 调试和学习技巧

#### 🔍 查看详细信息

```bash
# 查看 uv 环境信息
uv --version
uv venv list

# 查看项目依赖树
uv pip show --files fastapi

# 检查环境变量
uv run python -c "import os; [print(f'{k}={v}') for k,v in os.environ.items() if 'SUPABASE' in k]"
```

#### 📊 性能监控

```bash
# 查看数据库连接
uv run python -c "
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
load_dotenv()
engine = create_engine(os.getenv('SUPABASE_DB_STRING'))
with engine.connect() as conn:
    result = conn.execute(text('SELECT version()'))
    print(result.fetchone())
"

# 启动时显示详细日志
uv run uvicorn app.main:app --reload --log-level debug --access-log
```

#### 🧪 交互式调试

```bash
# 启动 Python REPL 加载项目环境
uv run python

# 在 REPL 中测试组件
>>> from app.dependencies import get_supabase_client
>>> client = get_supabase_client()
>>> print(client)
```

## 🎯 学习路径建议

### 初学者路径
1. **理解项目结构**: 熟悉 `app/` 目录下的各个模块
2. **练习 uv 命令**: 尝试添加/删除依赖，观察 `uv.lock` 变化
3. **学习 SQLModel**: 理解 ORM 和数据库模型关系
4. **掌握 SQLModel**: 理解 ORM 查询和数据操作
5. **探索 FastAPI**: 在 `/docs` 中测试各种 API 端点

### 进阶路径
1. **自定义路由**: 在 `app/routers/` 中添加新的业务逻辑
2. **数据库优化**: 学习索引、查询优化
3. **认证扩展**: 理解 Supabase RLS 和 JWT 认证
4. **错误处理**: 实现完善的异常处理机制
5. **测试编写**: 使用 `uv run pytest` 编写单元测试

### 实用技巧
```bash
# 保持依赖最新
uv sync --upgrade

# 查看项目信息
uv run python -c "from app.main import app; print(app.openapi()['info'])"

# 快速重启开发环境
uv run uvicorn app.main:app --reload --port 8000
```

## 🏁 总结

现在你已经拥有了：
- ✅ 基于 uv 的现代 Python 项目环境
- ✅ 连接到 Supabase 的 FastAPI 应用  
- ✅ 简洁的数据库连接和 ORM 系统
- ✅ 学习导向的开发工作流

**主要命令回顾**:
- `uv sync` - 同步依赖
- `uv run uvicorn app.main:app --reload` - 启动开发服务器
- `uv add package-name` - 添加新依赖
- `uv run pytest` - 运行测试

# 快速重启开发环境
uv run uvicorn app.main:app --reload --host localhost --port 8000

开始你的开发之旅吧！🚀

---
💡 **提示**: 随时使用 `uv run python -c "help()"` 进入交互式帮助系统学习更多！

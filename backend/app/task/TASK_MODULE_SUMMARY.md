# Task Module - 大模型打分任务系统总结

## 概述

`backend/app/task` 模块是一个完整的AI代理任务管理系统，主要实现了两个核心功能：
1. **Seek.com求职网站爬虫** - 自动化工作搜索和数据收集
2. **AI简历-工作匹配打分** - 使用大模型对简历和工作进行智能匹配分析

## 📁 文件结构

```
backend/app/task/
├── __init__.py                    # 模块初始化
├── dependencies.py                # 依赖注入（数据库会话、用户认证）
├── models.py                      # 数据库模型定义
├── router.py                      # FastAPI路由端点
├── schemas.py                     # Pydantic数据验证模式
├── README.md                      # 原有的功能说明文档
├── service/                       # 业务逻辑服务层
│   ├── __init__.py
│   ├── task_service.py           # 任务管理核心服务
│   ├── seek_scraper_service.py   # Seek网站爬虫服务
│   └── resume_matching_service.py # AI简历匹配服务
└── utils/                         # 工具类
    ├── __init__.py
    ├── llm_client.py             # 大模型客户端（支持多种AI提供商）
    └── prompts.py                # AI分析提示词模板
```

## 🗄️ 数据库模型

### AgentTasks - 任务表
- **功能**: 管理所有代理任务的生命周期
- **关键字段**:
  - `task_type`: 任务类型（"seek_scraper", "resume_job_matching"）
  - `status`: 任务状态（pending, running, completed, failed）
  - `task_instructions`: JSON格式的任务参数
  - `execution_result`: JSON格式的执行结果
  - 支持循环执行任务配置

### AgentFoundJobs - 找到的工作表
- **功能**: 存储爬虫找到的工作信息和AI分析结果
- **关键字段**:
  - 基本工作信息：title, company, location, salary, job_url
  - AI分析结果：`match_score` (0-100分), `ai_analysis` (详细分析JSON)
  - 用户操作：saved, application_status

## 🔧 核心服务

### 1. TaskService - 任务管理服务
**文件**: `service/task_service.py`

**主要功能**:
- 创建和更新任务记录
- 执行Seek爬虫任务
- 执行简历-工作匹配分析
- 任务状态管理和错误处理

**关键方法**:
- `create_agent_task()` - 创建新任务
- `execute_seek_scraper()` - 执行爬虫任务
- `execute_resume_job_matching()` - 执行AI匹配分析

### 2. SeekScraperService - 爬虫服务
**文件**: `service/seek_scraper_service.py`

**主要功能**:
- 使用Selenium自动化浏览器爬取Seek.com
- 反反爬虫机制（随机延迟、真实用户代理、无头模式）
- 多页面数据采集直到达到目标数量
- 获取工作详细描述和工作类型

**技术特点**:
- Chrome无头浏览器
- 智能选择器适配网站变化
- 数据去重和验证
- 异步执行避免阻塞

### 3. ResumeMatchingService - AI匹配服务 ⭐
**文件**: `service/resume_matching_service.py`

**主要功能**:
- 使用大模型分析简历与工作的匹配度
- 批量处理多个工作职位
- 生成详细的分析报告和建议
- 支持多种AI模型提供商

**分析流程**:
1. 验证简历和任务数据
2. 创建匹配分析任务
3. 批量处理工作（每批5个，避免API限制）
4. 为每个工作生成0-100分的匹配分数
5. 提供详细分析（优势、不足、建议）
6. 更新任务状态和结果统计

### 4. JobAgentService - 智能求职助手 🚀
**文件**: `service/job_agent_service.py`

**主要功能**:
- 结合爬虫和AI匹配的一站式服务
- 自动执行完整的求职流程
- 无缝集成两个核心功能
- 提供统一的用户体验

**执行流程**:
1. 验证用户简历存在性
2. 创建综合任务记录
3. 执行Seek爬虫搜索工作
4. 对找到的工作进行AI匹配分析
5. 更新所有工作的匹配分数和分析
6. 返回完整的执行结果和统计信息

## 🤖 大模型集成

### LLMClient - 通用AI客户端
**文件**: `utils/llm_client.py`

**支持的AI提供商**:
- **DeepSeek** (默认) - 性价比高的中文大模型
- **OpenAI** - GPT系列模型
- **Google** - Gemini模型
- **Azure OpenAI** - 企业级OpenAI服务

**核心功能**:
- 统一的API接口，支持多种AI提供商
- 结构化输出（Function Calling）
- 智能降级处理（API失败时的备用方案）
- 详细的错误处理和日志记录

### 提示词工程
**文件**: `utils/prompts.py`

**精心设计的分析提示词**:
- 专业的HR分析师角色设定
- 详细的评分标准（0-100分制）
- 多维度评估（技能40%、经验30%、行业15%、教育10%、文化匹配5%）
- 结构化输出要求（摘要、优势、不足、建议、推理）

## 🌐 API端点

### 任务管理端点
- `POST /tasks/seek-scraper` - 启动Seek爬虫任务
- `POST /tasks/resume-job-matching` - 启动AI匹配分析 ⭐
- `POST /tasks/job-agent` - 启动智能求职助手（综合任务）🚀
- `GET /tasks/` - 获取用户任务列表
- `GET /tasks/{task_id}` - 获取特定任务详情
- `PUT /tasks/{task_id}` - 更新任务状态

### 工作管理端点
- `GET /tasks/found-jobs/` - 获取找到的工作列表
- `GET /tasks/found-jobs/{job_id}` - 获取特定工作详情
- `PUT /tasks/found-jobs/{job_id}` - 更新工作状态

### 简历管理端点
- `GET /tasks/resumes/` - 获取用户简历列表

## 📊 数据流程

### Seek爬虫流程
1. 用户提交爬虫请求（职位标题、地点、数量）
2. 创建AgentTask记录
3. 异步启动Selenium爬虫
4. 多页面采集直到达到目标数量
5. 保存工作信息到AgentFoundJobs表
6. 更新任务状态为completed

### AI匹配分析流程 ⭐
1. 用户选择简历和包含工作的任务
2. 验证数据有效性
3. 创建匹配分析任务
4. 提取简历和工作关键信息
5. 批量调用大模型API进行分析
6. 为每个工作生成匹配分数和详细分析
7. 更新工作记录的match_score和ai_analysis字段
8. 统计分析结果并完成任务

### Job Agent 智能助手流程 🚀
1. 用户提交综合请求（职位+简历+AI模型）
2. 系统验证简历存在性
3. 创建job_agent类型任务
4. 自动执行Seek爬虫搜索
5. 无缝转入AI匹配分析阶段
6. 批量分析所有找到的工作
7. 更新任务状态和统计结果
8. 返回完整的执行报告

## 🔍 大模型打分详解

### 评分标准
- **90-100分**: 极佳匹配 - 候选人超越要求
- **80-89分**: 优秀匹配 - 满足大部分要求
- **70-79分**: 良好匹配 - 满足核心要求但有小缺口
- **60-69分**: 一般匹配 - 有相关技能但缺少关键要求
- **50-59分**: 中等匹配 - 部分相关经验但有显著差距
- **30-49分**: 较弱匹配 - 相关经验有限
- **0-29分**: 不匹配 - 几乎没有相关经验

### 分析输出结构
```json
{
  "matching_score": 85,
  "ai_analysis": {
    "summary": "候选人与职位匹配度很高，技能和经验都很符合要求",
    "strengths": [
      "具备所需的Python和数据分析技能",
      "有3年相关工作经验",
      "教育背景匹配"
    ],
    "gaps": [
      "缺少机器学习项目经验",
      "没有云平台使用经验"
    ],
    "recommendations": [
      "补充机器学习相关项目",
      "学习AWS或Azure云服务"
    ],
    "reasoning": "详细的评分推理过程..."
  }
}
```

## 🛠️ 技术特点

### 可扩展性
- 模块化设计，易于添加新的爬虫源
- 支持多种AI模型，可根据需求切换
- 统一的任务管理框架

### 可靠性
- 完善的错误处理和重试机制
- 数据验证和去重
- 详细的日志记录

### 性能优化
- 异步处理避免阻塞
- 批量处理减少API调用
- 智能延迟避免被限制

### 安全性
- 用户数据隔离
- API密钥安全管理
- 输入验证和清理

## 🔗 系统集成

该模块已完全集成到主FastAPI应用中：
- 在 `backend/app/main.py` 中注册路由：`app.include_router(task.router, prefix="/tasks", tags=["tasks"])`
- 使用统一的认证和数据库依赖
- 与现有的用户管理和简历管理模块协同工作

## 📝 使用示例

### 启动AI匹配分析
```bash
curl -X POST "http://localhost:8000/tasks/resume-job-matching" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resume_id": "uuid-of-resume",
    "task_id": "uuid-of-task-with-jobs",
    "ai_model": "deepseek",
    "task_description": "分析简历与数据科学职位的匹配度"
  }'
```

### 启动智能求职助手 🚀
```bash
curl -X POST "http://localhost:8000/tasks/job-agent" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job_titles": ["Data Analyst", "Data Scientist"],
    "location": "Sydney NSW",
    "job_required": 5,
    "task_description": "智能求职：搜索数据分析职位并进行AI匹配",
    "resume_id": "uuid-of-resume",
    "ai_model": "deepseek"
  }'
```

### 查看分析结果
```bash
curl -X GET "http://localhost:8000/tasks/found-jobs/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🎯 总结

这个Task模块是一个功能完整的AI驱动的求职助手系统，结合了网络爬虫技术和大模型分析能力，为用户提供了从工作搜索到智能匹配分析的完整解决方案。其模块化设计和多AI提供商支持使其具有很强的扩展性和实用性。

## 🧩 本次修复与修改记录（DeepSeek 打分问题）

### 背景
- 调用 DeepSeek 为简历-职位匹配打分时，接口返回内容未被正确解析，日志出现 `"'\n  \"matching_score\"'"` 错误，数据库 `ai_analysis` 落了错误信息。

### 核心问题定位
- 根因一：使用 `str.format` 渲染提示词时，模板中的花括号与 JSON 内容的花括号冲突，触发 KeyError（例如 `matching_score` 被当作占位符）。
- 根因二：DeepSeek 的 OpenAI 兼容接口对 Function Calling 支持不稳定，直接解析 `function_call.arguments` 易失败。
- 根因三：模型偶尔会在 JSON 外包裹文字或 ```json 代码块，导致直接 `json.loads` 失败。

### 具体修改
- 文件：`backend/app/task/utils/llm_client.py`
  - 替换提示词渲染方式：不再使用 `prompt_template.format(...)`，改为仅替换 `{resume_json}` 和 `{job_json}` 占位符，避免与其它花括号冲突。
  - DeepSeek 路径：禁用 Function Calling，优先请求 JSON-only 响应；先尝试 `json.loads`，再走健壮的回退解析。
  - Fallback 解析器增强：
    - 去除 ```json 代码围栏，
    - 用正则提取最可能的顶层 JSON，
    - 缺失字段时填入安全默认值，`matching_score` 强制转 int。
  - OpenAI/Azure 路径：Function Calling 解析改为更稳健（防止直接下标 KeyError），失败后统一走文本 JSON 解析回退。

### 验证步骤（建议）
1. 重启后调用 `POST /tasks/resume-job-matching`。
2. 观察日志不再出现 `matching_score` 相关 KeyError。
3. 在 `GET /tasks/found-jobs/` 中查看 `match_score` 与 `ai_analysis` 字段是否为合理数值与结构化内容。

### 影响与收益
- 彻底修复了提示词渲染导致的 KeyError。
- 即使模型返回包裹文本或代码块，也能稳定抽取并解析 JSON。
- DeepSeek 环境下评分与分析更稳定，失败率显著下降。

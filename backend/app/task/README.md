# Task Module - Agent任务管理和求职爬虫

本模块实现了AI代理任务管理系统，特别是Seek.com求职网站的爬虫功能。

## 功能特性

### 1. 数据库模型
- **AgentTasks**: 管理所有代理任务
- **AgentFoundJobs**: 存储爬虫找到的工作机会

### 2. 核心服务
- **TaskService**: 任务管理和执行服务
- **SeekScraperService**: Seek网站爬虫服务

### 3. API端点

#### 任务管理
- `POST /tasks/seek-scraper` - 执行Seek爬虫任务
- `GET /tasks/` - 获取用户任务列表
- `GET /tasks/{task_id}` - 获取特定任务详情
- `PUT /tasks/{task_id}` - 更新任务状态

#### 工作管理
- `GET /tasks/found-jobs/` - 获取找到的工作列表
- `GET /tasks/found-jobs/{job_id}` - 获取特定工作详情  
- `PUT /tasks/found-jobs/{job_id}` - 更新工作状态（如标记为已保存）

## 测试API使用

### 1. 启动Seek爬虫
```bash
curl -X POST "http://localhost:8000/tasks/seek-scraper" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job_titles": ["Senior Data Analyst", "Data Scientist"],
    "location": "Sydney NSW",
    "job_required": 5,
    "task_description": "寻找5个数据分析相关职位"
  }'
```

### 2. 查看任务状态
```bash
curl -X GET "http://localhost:8000/tasks/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. 查看找到的工作
```bash
curl -X GET "http://localhost:8000/tasks/found-jobs/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. 标记工作为已保存
```bash
curl -X PUT "http://localhost:8000/tasks/found-jobs/{job_id}" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "saved": true
  }'
```

## 数据流程

1. 用户通过API发送爬虫请求
2. 系统创建AgentTask记录任务信息
3. SeekScraperService异步执行爬虫
4. 找到的工作保存到AgentFoundJobs表
5. 更新任务状态为completed
6. 用户可以查看和管理找到的工作

## 爬虫特性

- **反反爬虫**: 使用真实浏览器和随机延迟
- **详细信息**: 获取职位完整描述和工作类型
- **数据清洗**: 标准化薪资、地点等信息
- **错误处理**: 优雅处理网站变化和异常
- **批量处理**: 支持多个职位标题同时搜索

## 环境要求

确保系统已安装：
- Chrome浏览器
- ChromeDriver
- Selenium Python包

所有依赖已在 `pyproject.toml` 中定义。

## 注意事项

1. 爬虫使用无头模式运行，避免干扰
2. 包含随机延迟，降低被检测风险
3. 支持多页搜索，但建议适量使用
4. 所有工作数据与用户ID关联，确保数据隔离
5. 任务执行过程中会记录详细日志

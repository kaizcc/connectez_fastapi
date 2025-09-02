# 🐳 Docker 完整部署指南

## 📋 项目概述

本项目是一个基于 **FastAPI + React** 的全栈 AI 职位代理平台，支持浏览器自动化和智能职位匹配功能。

### 🏗️ 技术栈
- **后端**: FastAPI + Python 3.11 + Playwright + Selenium + browser-use
- **前端**: React + Vite + TypeScript + Tailwind CSS
- **数据库**: Supabase (PostgreSQL)
- **部署**: Docker + Docker Compose

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <your-repo-url>
cd fastapi-supabase-react
```

### 2. 配置环境变量

#### 后端配置
```bash
cd backend
cp env_template.txt .env

# 编辑 .env 文件，填入Supabase配置
nano .env
```

必填配置：
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_DB_STRING=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

#### 前端配置
```bash
cd ../frontend
cp env.example .env.local

# 编辑前端配置
nano .env.local
```

基本配置：
```env
VITE_API_BASE_URL=http://backend:8000
```

### 3. 一键部署整个应用

```bash
# 回到项目根目录
cd ..

# 使用完整栈部署
docker-compose -f docker-compose.full-stack.yml up --build -d

# 查看服务状态
docker-compose -f docker-compose.full-stack.yml ps

# 查看日志
docker-compose -f docker-compose.full-stack.yml logs -f
```

### 4. 访问应用

- 🌐 **前端应用**: http://localhost:3000
- 🔧 **后端API**: http://localhost:8000
- 📚 **API文档**: http://localhost:8000/docs
- ❤️ **健康检查**: 
  - 前端: http://localhost:3000/health
  - 后端: http://localhost:8000/

## 🎯 部署方案选择

### 方案一: 完整全栈部署 (推荐)

适用于**生产环境**和**一体化部署**：

```bash
# 使用完整配置文件
docker-compose -f docker-compose.full-stack.yml up --build -d
```

**特点**:
- ✅ 前后端一起部署
- ✅ 网络自动配置
- ✅ 服务依赖管理
- ✅ 统一日志和监控
- ✅ 资源限制和健康检查

### 方案二: 分离部署

适用于**开发环境**和**独立维护**：

#### 只部署后端
```bash
cd backend
docker-compose up --build -d
```

#### 只部署前端
```bash
cd frontend
docker-compose up --build -d
```

## 📊 服务详情

### 🔧 后端服务 (FastAPI)

| 特性 | 说明 |
|------|------|
| 端口 | 8000 |
| 内存限制 | 2GB |
| CPU限制 | 1.0 cores |
| 浏览器支持 | ✅ Chrome + Playwright |
| AI功能 | ✅ browser-use + LLM |
| 数据库 | ✅ Supabase连接 |

**包含功能**:
- 🤖 AI驱动的浏览器自动化
- 🕷️ Seek网站职位爬取
- 📋 简历职位匹配分析
- 🔐 用户认证和权限管理
- 📊 任务管理和进度跟踪

### 🌐 前端服务 (React)

| 特性 | 说明 |
|------|------|
| 端口 | 3000 (映射到80) |
| 内存限制 | 512MB |
| CPU限制 | 0.5 cores |
| Web服务器 | Nginx |
| 路由 | ✅ SPA路由支持 |

**包含功能**:
- 🎨 现代化React界面
- 📱 响应式设计
- 🔄 实时状态更新
- 📋 任务创建和管理
- 📈 数据可视化

## 🔧 高级配置

### 环境变量完整列表

#### 后端环境变量
```env
# 必填
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_DB_STRING=postgresql://...

# 可选
DEBUG=false
LOG_LEVEL=INFO
HEADLESS=true
DISPLAY=:99
```

#### 前端环境变量
```env
# 必填
VITE_API_BASE_URL=http://backend:8000

# 可选
VITE_APP_TITLE=Job Agent Platform
VITE_DEBUG_MODE=false
```

### 资源配置调整

如果需要调整资源限制，编辑 `docker-compose.full-stack.yml`：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 4G    # 增加内存
          cpus: '2.0'   # 增加CPU
  
  frontend:
    deploy:
      resources:
        limits:
          memory: 1G    # 增加内存
```

### 网络配置

默认网络配置：
```yaml
networks:
  app-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## 📊 监控和维护

### 查看日志
```bash
# 所有服务日志
docker-compose -f docker-compose.full-stack.yml logs -f

# 特定服务日志
docker-compose -f docker-compose.full-stack.yml logs -f backend
docker-compose -f docker-compose.full-stack.yml logs -f frontend

# 最近1小时日志
docker-compose -f docker-compose.full-stack.yml logs --since="1h"
```

### 健康检查
```bash
# 检查所有服务状态
docker-compose -f docker-compose.full-stack.yml ps

# 手动健康检查
curl http://localhost:8000/
curl http://localhost:3000/health
```

### 资源监控
```bash
# 查看资源使用
docker stats

# 查看特定容器
docker stats $(docker-compose -f docker-compose.full-stack.yml ps -q)
```

## 🛠️ 故障排除

### 常见问题

#### 1. 后端服务启动失败
```bash
# 检查后端日志
docker-compose -f docker-compose.full-stack.yml logs backend

# 常见原因:
# - Supabase配置错误
# - 浏览器依赖问题
# - 内存不足
```

#### 2. 前端无法连接后端
```bash
# 检查网络连接
docker exec $(docker-compose -f docker-compose.full-stack.yml ps -q frontend) \
    wget -qO- http://backend:8000/

# 检查环境变量
docker-compose -f docker-compose.full-stack.yml exec frontend env | grep VITE_
```

#### 3. 浏览器自动化失败
```bash
# 检查Chrome安装
docker-compose -f docker-compose.full-stack.yml exec backend google-chrome --version

# 检查Playwright
docker-compose -f docker-compose.full-stack.yml exec backend \
    python -c "from playwright.sync_api import sync_playwright; print('Playwright OK')"
```

### 调试命令

```bash
# 进入后端容器
docker-compose -f docker-compose.full-stack.yml exec backend bash

# 进入前端容器
docker-compose -f docker-compose.full-stack.yml exec frontend sh

# 重启特定服务
docker-compose -f docker-compose.full-stack.yml restart backend

# 重新构建并启动
docker-compose -f docker-compose.full-stack.yml up --build -d
```

## 🚀 生产环境部署

### 1. 环境准备

```bash
# 服务器最低配置建议
# CPU: 2核心
# 内存: 4GB
# 磁盘: 20GB
# 系统: Ubuntu 20.04+ / CentOS 8+
```

### 2. 域名和SSL配置

创建 `nginx-proxy.conf`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # 后端API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. 生产环境配置

```bash
# 设置生产环境变量
export NODE_ENV=production
export DEBUG=false
export VITE_API_BASE_URL=https://api.yourdomain.com

# 使用生产配置启动
docker-compose -f docker-compose.full-stack.yml -f docker-compose.prod.yml up -d
```

### 4. 自动备份脚本

```bash
#!/bin/bash
# backup.sh

# 备份应用数据
docker-compose -f docker-compose.full-stack.yml exec backend \
    pg_dump $SUPABASE_DB_STRING > backup_$(date +%Y%m%d).sql

# 备份Docker镜像
docker save -o app_images_$(date +%Y%m%d).tar \
    $(docker-compose -f docker-compose.full-stack.yml images -q)
```

## 📈 扩展和优化

### 水平扩展

```bash
# 扩展前端服务
docker-compose -f docker-compose.full-stack.yml up -d --scale frontend=3

# 使用负载均衡器(如nginx-proxy)
```

### 性能优化

1. **启用CDN** - 前端静态资源
2. **数据库连接池** - 后端优化
3. **Redis缓存** - 启用缓存层
4. **资源监控** - Prometheus + Grafana

### CI/CD集成

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy Application
        run: |
          docker-compose -f docker-compose.full-stack.yml pull
          docker-compose -f docker-compose.full-stack.yml up -d
          
      - name: Health Check
        run: |
          sleep 60
          curl -f http://localhost:3000/health
          curl -f http://localhost:8000/
```

## 🎓 最佳实践

### 安全建议
- ✅ 定期更新Docker镜像
- ✅ 使用非root用户运行容器
- ✅ 配置防火墙规则
- ✅ 启用HTTPS
- ✅ 定期备份数据

### 运维建议
- 📊 设置日志轮转
- 🔄 定期重启服务
- 📈 监控资源使用
- 🔍 设置告警机制
- 📋 制定灾难恢复计划

---

## 📞 支持

如果遇到问题：
1. 查看相关日志
2. 检查环境配置
3. 参考故障排除章节
4. 提交GitHub Issue

**部署愉快！** 🚀

# 🐳 Docker 部署指南

## 📋 部署方案总览

本项目使用Docker容器化部署，可以完美支持浏览器自动化功能（Playwright + Selenium + browser-use）在容器内运行。

## 🚀 快速开始

### 1. 准备环境变量

创建 `.env` 文件：
```bash
# 复制环境变量模板
cp env_template.txt .env

# 编辑配置
nano .env
```

确保包含以下配置：
```env
# Supabase配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_DB_STRING=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# 可选配置
DEBUG=false
LOG_LEVEL=INFO
```

### 2. 构建并启动服务

```bash
# 使用docker-compose构建并启动
docker-compose up --build -d

# 查看日志
docker-compose logs -f fastapi-backend

# 检查服务状态
docker-compose ps
```

### 3. 验证部署

访问以下地址验证服务：
- API文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/

## 🔧 详细配置说明

### Docker镜像特性

我们的Docker镜像包含：
- ✅ Python 3.11 运行环境
- ✅ 完整的Chrome浏览器支持
- ✅ Playwright 浏览器引擎
- ✅ Selenium WebDriver支持
- ✅ 中文字体支持
- ✅ 虚拟显示环境(Xvfb)
- ✅ 安全的非root用户运行

### 浏览器配置优化

项目已针对容器环境优化：

```python
# 容器内浏览器配置自动应用：
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')
chrome_options.add_argument('--headless')  # 强制无头模式
chrome_options.add_argument('--disable-gpu')
```

### 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `HEADLESS` | 强制无头模式 | `true` |
| `DISPLAY` | 虚拟显示 | `:99` |
| `PLAYWRIGHT_BROWSERS_PATH` | Playwright浏览器路径 | `/ms-playwright` |

## 🏗️ 生产环境部署

### 1. 单机部署

```bash
# 生产环境构建
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 配置反向代理（Nginx示例）
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 2. 集群部署

```bash
# 扩展服务实例
docker-compose up -d --scale fastapi-backend=3

# 使用负载均衡器（如Traefik或nginx-proxy）
```

### 3. 云平台部署

#### AWS ECS
```bash
# 推送镜像到ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-west-2.amazonaws.com
docker tag your-app:latest your-account.dkr.ecr.us-west-2.amazonaws.com/your-app:latest
docker push your-account.dkr.ecr.us-west-2.amazonaws.com/your-app:latest
```

#### Google Cloud Run
```bash
# 构建并部署到Cloud Run
gcloud builds submit --tag gcr.io/your-project/fastapi-backend
gcloud run deploy --image gcr.io/your-project/fastapi-backend --platform managed
```

## 📊 监控和日志

### 查看实时日志
```bash
# 查看应用日志
docker-compose logs -f fastapi-backend

# 查看特定时间段日志
docker-compose logs --since="2h" fastapi-backend

# 导出日志到文件
docker-compose logs --no-color fastapi-backend > app.log
```

### 性能监控
```bash
# 查看容器资源使用
docker stats

# 查看特定容器
docker stats fastapi-backend_fastapi-backend_1
```

### 健康检查
```bash
# 手动健康检查
curl -f http://localhost:8000/

# Docker健康状态
docker-compose ps
```

## 🛠️ 故障排除

### 常见问题

#### 1. 浏览器启动失败
```bash
# 症状：selenium或playwright无法启动浏览器
# 解决：检查容器权限
docker-compose exec fastapi-backend google-chrome --version
docker-compose exec fastapi-backend ls -la /ms-playwright/
```

#### 2. 内存不足
```bash
# 增加容器内存限制
# 修改docker-compose.yml中的memory限制
deploy:
  resources:
    limits:
      memory: 4G  # 增加到4GB
```

#### 3. 网络连接问题
```bash
# 测试网络连接
docker-compose exec fastapi-backend curl -I https://www.seek.com.au

# 检查DNS解析
docker-compose exec fastapi-backend nslookup seek.com.au
```

### 调试技巧

#### 进入容器调试
```bash
# 进入运行中的容器
docker-compose exec fastapi-backend /bin/bash

# 在容器内测试浏览器
python3 -c "
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
options = Options()
options.add_argument('--headless')
options.add_argument('--no-sandbox')
driver = webdriver.Chrome(options=options)
driver.get('https://www.google.com')
print('Browser test successful!')
driver.quit()
"
```

#### 本地开发模式
```bash
# 开发模式挂载代码
# 修改docker-compose.yml添加：
volumes:
  - .:/app
  - /app/.venv  # 排除虚拟环境

# 启动开发模式
docker-compose -f docker-compose.dev.yml up
```

## 🔒 安全配置

### 生产环境安全清单

- ✅ 使用非root用户运行
- ✅ 最小权限原则
- ✅ 环境变量外部化
- ✅ 镜像安全扫描
- ✅ 网络隔离
- ✅ 日志审计

### 安全加固
```bash
# 扫描镜像漏洞
docker scan your-app:latest

# 使用多阶段构建减小攻击面
# 在Dockerfile中实现distroless final stage
```

## 📈 性能优化

### 1. 镜像优化
```dockerfile
# 使用.dockerignore减小构建上下文
# 多阶段构建
# 合并RUN命令减少层数
```

### 2. 运行时优化
```bash
# 调整Chrome参数
--disable-background-timer-throttling
--disable-renderer-backgrounding
--disable-features=TranslateUI,VizDisplayCompositor
```

### 3. 资源配置
```yaml
# docker-compose.yml中的资源限制
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '1.0'
    reservations:
      memory: 512M
      cpus: '0.5'
```

## 🚀 持续集成/持续部署 (CI/CD)

### GitHub Actions示例
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build and Deploy
        run: |
          docker-compose build
          docker-compose up -d
          
      - name: Health Check
        run: |
          sleep 30
          curl -f http://localhost:8000/ || exit 1
```

## 📚 相关资源

- [Docker官方文档](https://docs.docker.com/)
- [Docker Compose文档](https://docs.docker.com/compose/)
- [Playwright Docker指南](https://playwright.dev/docs/docker)
- [Selenium Docker指南](https://github.com/SeleniumHQ/docker-selenium)

---

需要帮助？请查看项目的GitHub Issues或联系维护团队。

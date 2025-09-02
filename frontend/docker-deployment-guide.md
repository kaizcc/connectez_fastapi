# 🚀 Frontend Docker 部署指南

## 📋 概述

这是基于React + Vite + TypeScript的前端应用Docker部署指南。使用Nginx作为Web服务器，支持SPA路由和API代理。

## 🏗️ 架构设计

```
┌─────────────────────────────────────┐
│          Docker Container          │
│  ┌─────────────┐  ┌─────────────┐  │
│  │   Nginx     │  │   Static    │  │
│  │   (Port 80) │  │   Files     │  │
│  │             │  │   (React)   │  │
│  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────┘
```

## 🚀 快速开始

### 1. 准备环境

确保已安装Docker和Docker Compose：
```bash
# 检查Docker版本
docker --version
docker-compose --version
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp env.example .env.local

# 编辑环境变量
nano .env.local
```

基本配置：
```env
# API后端地址
VITE_API_BASE_URL=http://localhost:8000  # 本地开发
# VITE_API_BASE_URL=http://backend:8000  # Docker网络
# VITE_API_BASE_URL=https://api.yourdomain.com  # 生产环境
```

### 3. 构建并运行

```bash
# 单独构建前端
docker-compose up --build -d

# 查看日志
docker-compose logs -f frontend

# 检查状态
docker-compose ps
```

### 4. 访问应用

- 前端应用: http://localhost:3000
- 健康检查: http://localhost:3000/health

## 🔧 详细配置

### Dockerfile 特性

我们的多阶段构建包含：

#### 构建阶段 (Node.js)
- ✅ 基于 node:18-alpine
- ✅ 安装依赖 (npm ci)
- ✅ 构建React应用 (npm run build)
- ✅ 优化构建产物

#### 生产阶段 (Nginx)
- ✅ 基于 nginx:alpine
- ✅ 自定义nginx配置
- ✅ 静态文件服务
- ✅ SPA路由支持
- ✅ API代理功能
- ✅ 安全headers
- ✅ Gzip压缩
- ✅ 缓存策略

### Nginx 配置亮点

```nginx
# SPA路由支持
location / {
    try_files $uri $uri/ /index.html;
}

# API代理
location /api/ {
    proxy_pass http://backend:8000/;
    # ... 其他代理配置
}

# 静态资源缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🌐 部署场景

### 场景1: 独立前端部署

```bash
# 只部署前端
cd frontend
docker-compose up --build -d

# 访问
curl http://localhost:3000
```

### 场景2: 与后端一起部署

创建根目录的 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  # 后端服务
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - SUPABASE_DB_STRING=${SUPABASE_DB_STRING}
    networks:
      - app-network

  # 前端服务
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    environment:
      - VITE_API_BASE_URL=http://backend:8000
    depends_on:
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### 场景3: 生产环境部署

```bash
# 生产环境配置
export VITE_API_BASE_URL=https://api.yourdomain.com

# 构建生产镜像
docker build -t frontend-prod .

# 运行生产容器
docker run -d \
  --name frontend-prod \
  -p 80:80 \
  -e VITE_API_BASE_URL=https://api.yourdomain.com \
  frontend-prod
```

## 🔄 CI/CD 集成

### GitHub Actions 示例

```yaml
name: Frontend CI/CD

on:
  push:
    branches: [main]
    paths: ['frontend/**']

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Frontend Image
        run: |
          cd frontend
          docker build -t frontend:${{ github.sha }} .
          
      - name: Deploy to Production
        run: |
          # 部署到你的服务器
          # 这里可以集成到各种云服务
```

### Docker Hub 发布

```bash
# 构建并标记镜像
docker build -t yourusername/job-agent-frontend:latest .

# 推送到Docker Hub
docker push yourusername/job-agent-frontend:latest

# 在服务器上拉取并运行
docker pull yourusername/job-agent-frontend:latest
docker run -d -p 80:80 yourusername/job-agent-frontend:latest
```

## 📊 监控和日志

### 查看日志
```bash
# 实时日志
docker-compose logs -f frontend

# 特定时间段日志
docker-compose logs --since="1h" frontend

# Nginx访问日志
docker exec frontend_container cat /var/log/nginx/access.log

# Nginx错误日志
docker exec frontend_container cat /var/log/nginx/error.log
```

### 性能监控
```bash
# 容器资源使用
docker stats frontend_container

# 网络连接检查
docker exec frontend_container netstat -tlnp
```

### 健康检查
```bash
# 手动健康检查
curl http://localhost:3000/health

# Docker健康状态
docker inspect frontend_container --format='{{.State.Health.Status}}'
```

## 🛠️ 故障排除

### 常见问题

#### 1. 构建失败
```bash
# 检查构建日志
docker-compose build --no-cache frontend

# 检查Node.js版本兼容性
docker run --rm node:18-alpine node --version
```

#### 2. API连接问题
```bash
# 检查网络连接
docker exec frontend_container wget -qO- http://backend:8000/

# 检查环境变量
docker exec frontend_container env | grep VITE_
```

#### 3. 路由不工作
```bash
# 检查nginx配置
docker exec frontend_container nginx -t

# 重新加载nginx配置
docker exec frontend_container nginx -s reload
```

#### 4. 静态文件404
```bash
# 检查构建产物
docker exec frontend_container ls -la /usr/share/nginx/html

# 检查nginx日志
docker exec frontend_container tail -f /var/log/nginx/error.log
```

### 调试技巧

#### 进入容器调试
```bash
# 进入运行中的容器
docker exec -it frontend_container sh

# 检查nginx进程
ps aux | grep nginx

# 测试nginx配置
nginx -t

# 查看端口监听
netstat -tlnp
```

#### 开发模式调试
```bash
# 挂载源代码进行开发
docker run -it --rm \
  -v $(pwd):/app \
  -w /app \
  -p 3000:5173 \
  node:18-alpine \
  npm run dev
```

## 🔒 安全配置

### 生产环境安全清单

- ✅ 使用非root用户运行nginx
- ✅ 配置安全headers
- ✅ 启用HTTPS (生产环境)
- ✅ 设置CSP策略
- ✅ 隐藏服务器版本信息
- ✅ 配置适当的CORS策略

### HTTPS配置 (生产环境)

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;
    
    # SSL配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # ... 其他配置
}
```

## 📈 性能优化

### 构建优化
```dockerfile
# 使用多阶段构建减小镜像大小
# 使用.dockerignore排除不必要的文件
# 使用npm ci而不是npm install
```

### 运行时优化
```nginx
# 启用Gzip压缩
gzip on;
gzip_types text/plain application/json application/javascript text/css;

# 设置适当的缓存策略
location ~* \.(js|css)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 资源优化
```yaml
# 在docker-compose.yml中设置资源限制
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
```

## 🚀 扩展和升级

### 水平扩展
```bash
# 扩展多个前端实例
docker-compose up -d --scale frontend=3

# 配合负载均衡器使用
```

### 滚动升级
```bash
# 构建新版本
docker build -t frontend:v2.0 .

# 逐个替换容器
docker-compose up -d --no-deps frontend
```

## 📚 相关资源

- [Vite 官方文档](https://vitejs.dev/)
- [React 官方文档](https://reactjs.org/)
- [Nginx 官方文档](https://nginx.org/en/docs/)
- [Docker 多阶段构建](https://docs.docker.com/develop/dev-best-practices/)

---

需要帮助？请查看项目的GitHub Issues或联系维护团队。

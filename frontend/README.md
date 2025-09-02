# 求职管理系统 - 前端

基于 React 18 + TypeScript + Vite 构建的现代化求职管理系统前端应用。

## 🚀 技术栈

- **React 18** - 用户界面库
- **TypeScript** - 类型安全的JavaScript
- **Vite** - 快速构建工具
- **Tailwind CSS** - 实用的CSS框架
- **React Router** - 客户端路由
- **TanStack Query** - 数据状态管理
- **Axios** - HTTP请求库
- **FastAPI后端** - 认证和数据管理

## 📁 项目结构

```
src/
├── components/          # 可复用组件
│   └── ProtectedRoute.tsx
├── pages/              # 页面组件
│   ├── Login.tsx       # 登录页面
│   └── Dashboard.tsx   # 仪表板
├── hooks/              # 自定义Hook
│   └── useAuth.ts      # 认证Hook
├── lib/               # 工具库
│   ├── api.ts         # API配置
│   └── auth.ts        # 认证服务
├── types/             # TypeScript类型定义
│   └── index.ts
├── utils/             # 工具函数
├── App.tsx            # 主应用组件
└── main.tsx           # 应用入口
```

## 🛠 开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:5173 启动

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 🔧 配置

### 环境变量

创建 `.env` 文件并配置以下变量：

```env
# 后端API配置
VITE_API_BASE_URL=http://localhost:8000
```

### API集成

前端通过以下方式与后端API通信：

1. **认证**: 后端FastAPI处理所有认证逻辑（注册、登录、验证）
2. **API请求**: 通过Axios实例向FastAPI后端发送请求
3. **状态管理**: 使用TanStack Query管理服务器状态
4. **Token管理**: JWT token存储在localStorage中，自动添加到请求头

## 🎨 样式

项目使用Tailwind CSS，包含：

- 响应式设计
- 自定义主题色彩
- 预定义组件类
- 现代化UI设计

### 主题色彩

- **Primary**: #6495ED (蓝色系)
- **Secondary**: #00AD6F (绿色系)

## 📱 功能特性

### 已实现

- ✅ 用户认证 (登录/注册)
- ✅ 保护路由
- ✅ 响应式设计
- ✅ 仪表板界面
- ✅ API集成基础设施

### 待开发

- 🔄 工作管理页面
- 🔄 简历管理功能
- 🔄 个人档案编辑
- 🔄 数据可视化
- 🔄 文件上传
- 🔄 搜索和筛选

## 🔐 认证流程

1. 用户在登录页面输入邮箱和密码
2. 前端调用后端 `/auth/login` API
3. 后端通过Supabase验证用户凭据
4. 验证成功后返回JWT token和用户信息
5. Token存储在localStorage中
6. 后续API请求自动在Authorization头中携带token
7. 受保护路由检查本地认证状态
8. `/auth/me` 端点用于验证token有效性

## 🧪 开发指南

### 添加新页面

1. 在 `src/pages/` 中创建新组件
2. 在 `src/App.tsx` 中添加路由
3. 如需认证保护，用 `ProtectedRoute` 包装

### 添加API调用

1. 在 `src/lib/api.ts` 中添加API函数
2. 使用TanStack Query创建查询Hook
3. 在组件中使用Hook

### 样式开发

1. 优先使用Tailwind实用类
2. 复杂样式在 `src/index.css` 中定义
3. 遵循响应式设计原则

## 🚀 部署

### Vercel部署

```bash
npm run build
npx vercel --prod
```

### Netlify部署

```bash
npm run build
# 上传dist目录到Netlify
```

## 📞 支持

如有问题，请检查：

1. 后端API是否正常运行 (http://localhost:8000)
2. 环境变量是否正确配置
3. Supabase项目设置是否正确
4. 网络连接是否正常
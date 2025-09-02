# 使用官方Python镜像作为基础镜像，包含必要的系统依赖
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖 - 浏览器运行所需
RUN apt-get update && apt-get install -y \
    # 基础工具
    wget \
    curl \
    gnupg \
    ca-certificates \
    # 字体和显示相关
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    # Chrome/Chromium依赖
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    # 虚拟显示相关
    xvfb \
    # 清理缓存
    && rm -rf /var/lib/apt/lists/*

# 安装Chrome浏览器
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# 安装uv包管理器
RUN pip install uv

# 复制项目文件
COPY pyproject.toml uv.lock ./

# 安装Python依赖
RUN uv sync --no-dev

# 安装Playwright浏览器
RUN uv run playwright install chromium
RUN uv run playwright install-deps

# 复制应用代码
COPY . .

# 设置环境变量
ENV PYTHONPATH=/app
ENV DISPLAY=:99
ENV PYTHONUNBUFFERED=1
# 强制无头模式，确保在容器中正常运行
ENV HEADLESS=true
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# 创建非root用户（安全最佳实践）
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# 启动应用
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

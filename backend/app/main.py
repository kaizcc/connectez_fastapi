import asyncio
import logging
import platform

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 🔧 Windows平台asyncio兼容性修复 - 必须在任何其他异步操作之前设置
if platform.system() == "Windows":
    try:
        # 多层次确保 Windows 兼容性
        import os
        import sys
        
        # 设置环境变量，确保子进程也使用正确的策略
        os.environ['PYTHONASYNCIODEBUG'] = '0'  # 关闭调试模式避免干扰
        
        # 强制设置事件循环策略
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
        # 验证策略设置
        current_policy = asyncio.get_event_loop_policy()
        if isinstance(current_policy, asyncio.WindowsProactorEventLoopPolicy):
            print("✅ Windows平台: ProactorEventLoopPolicy设置成功")
        else:
            print(f"❌ Windows平台: 策略设置失败，当前策略: {type(current_policy)}")
            # 尝试备用方法
            import asyncio.windows_events
            asyncio.set_event_loop_policy(asyncio.windows_events.WindowsProactorEventLoopPolicy())
            print("🔨 Windows平台: 使用备用方法设置策略")
            
        # 预创建事件循环以确保后续使用正确的策略
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            print("🔧 Windows平台: 预创建事件循环成功")
        except Exception as loop_error:
            print(f"⚠️ 预创建事件循环失败: {loop_error}")
            
    except Exception as e:
        print(f"❌ 无法设置Windows事件循环策略: {e}")
        
    # 额外的 Windows 兼容性设置
    try:
        import multiprocessing
        multiprocessing.set_start_method('spawn', force=True)
        print("🔧 Windows平台: 设置multiprocessing为spawn模式")
    except Exception as mp_error:
        print(f"⚠️ 设置multiprocessing失败: {mp_error}")

from .auth import router as auth
from .jobs import router as jobs
from .agent.router import router as agent
from .task import router as task

logger = logging.getLogger(__name__)
logging.info("Starting FastAPI app")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:5173",  # Vite dev server (127.0.0.1)
        "http://localhost:3000",  # React dev server (if needed)
        "http://127.0.0.1:3000",  # React dev server (127.0.0.1)
        "http://localhost:8081",  # Original config
        "http://127.0.0.1:8081",  # Original config (127.0.0.1)
        "https://connectez.co",
        "http://agent-frontend",
        "http://agent-frontend:5173",
        "http://124.170.182.254:5173",
        "https://jobfrontend.kaiwk.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
app.include_router(agent, prefix="/agent", tags=["agent"])
app.include_router(task.router, prefix="/tasks", tags=["tasks"])

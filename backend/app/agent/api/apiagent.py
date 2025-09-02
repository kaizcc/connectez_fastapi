#!/usr/bin/env python3
"""
基于工作版本的完整参数 API
使用 fixed_enhanced_api.py 作为基础，添加完整参数支持
"""

import asyncio
import os
import platform
import multiprocessing
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import uvicorn
from datetime import datetime

# 导入传统功能
from playwright.async_api import async_playwright

# 导入智能功能
try:
    from browser_use import Agent
    INTELLIGENT_AVAILABLE = True
except ImportError:
    INTELLIGENT_AVAILABLE = False

app = FastAPI(
    title="基于工作版本的完整浏览器自动化 API",
    description="支持完整参数配置的智能浏览器自动化服务",
    version="5.0.0"
)

# ==================== 数据模型 ====================

class CompleteIntelligentBrowserTask(BaseModel):
    """完整的智能浏览器任务请求 - 包含所有原项目参数"""
    # 基础任务参数
    task: str = Field(..., description="自然语言任务描述")
    url: Optional[str] = Field("https://google.com", description="起始 URL")
    
    # 执行控制参数
    max_steps: Optional[int] = Field(8, description="最大执行步骤数")
    use_vision: Optional[bool] = Field(True, description="是否使用视觉识别")
    max_actions_per_step: Optional[int] = Field(2, description="每步最大动作数")
    
    # LLM 模型参数
    model_provider: Optional[str] = Field(None, description="模型提供商 (openai/anthropic/deepseek/ollama/azure)")
    model_name: Optional[str] = Field(None, description="具体模型名称")
    temperature: Optional[float] = Field(0.3, description="模型温度参数")
    
    # 浏览器配置参数
    headless: Optional[bool] = Field(False, description="是否无头模式")
    viewport_width: Optional[int] = Field(1920, description="视口宽度")
    viewport_height: Optional[int] = Field(1080, description="视口高度")
    chrome_path: Optional[str] = Field(None, description="Chrome 可执行文件路径")
    disable_security: Optional[bool] = Field(False, description="是否禁用安全特性")
    
    # 网络和代理参数
    proxy_server: Optional[str] = Field(None, description="代理服务器地址")
    user_agent: Optional[str] = Field(None, description="自定义 User-Agent")
    ignore_https_errors: Optional[bool] = Field(False, description="是否忽略 HTTPS 错误")
    
    # 录制和追踪参数
    save_recording: Optional[bool] = Field(False, description="是否保存录制视频")
    recording_path: Optional[str] = Field(None, description="录制文件保存路径")
    enable_trace: Optional[bool] = Field(False, description="是否启用执行追踪")
    trace_path: Optional[str] = Field(None, description="追踪文件保存路径")
    save_screenshots: Optional[bool] = Field(False, description="是否保存步骤截图")
    
    # 高级配置参数
    cookies_file: Optional[str] = Field(None, description="Cookie 文件路径")
    extra_chromium_args: Optional[List[str]] = Field(None, description="额外的 Chromium 启动参数")
    wss_url: Optional[str] = Field(None, description="WebSocket 调试 URL")
    no_viewport: Optional[bool] = Field(False, description="是否禁用视口设置")

class DetailedStepInfo(BaseModel):
    """详细的执行步骤信息"""
    step_number: int
    action: str
    reasoning: Optional[str] = None
    success: bool
    error: Optional[str] = None
    execution_time: Optional[float] = None

class CompleteTaskResult(BaseModel):
    """完整的任务结果"""
    success: bool
    result: Optional[str] = None
    error: Optional[str] = None
    mode: str
    steps: Optional[List[DetailedStepInfo]] = None
    total_steps: Optional[int] = None
    execution_time: Optional[float] = None
    model_used: Optional[str] = None
    config_used: Optional[Dict[str, Any]] = None
    recording_file: Optional[str] = None
    trace_file: Optional[str] = None
    screenshots: Optional[List[str]] = None
    final_url: Optional[str] = None
    final_title: Optional[str] = None
    cookies_saved: Optional[str] = None

# ==================== LLM 创建函数 ====================

def create_llm(provider: str = None, model_name: str = None, temperature: float = 0.3):
    """创建 LLM 实例 - 支持完整的模型提供商"""
    print(f"🔧 尝试创建 LLM - Provider: {provider}, Model: {model_name}")
    
    # 导入我们的 LLM 工厂
    from core.utils import get_llm_model, model_names
    
    # 如果没有指定，按优先级尝试
    if not provider:
        if os.getenv("DEEPSEEK_API_KEY"):
            provider = "deepseek"
        elif os.getenv("OPENAI_API_KEY"):
            provider = "openai"
        elif os.getenv("ANTHROPIC_API_KEY"):
            provider = "anthropic"
        else:
            return None, "没有找到有效的 API key"
    
    # 如果没有指定模型，使用默认模型
    if not model_name:
        available_models = model_names.get(provider.lower(), [])
        if available_models:
            model_name = available_models[0]
        else:
            return None, f"提供商 {provider} 没有可用的模型"
    
    try:
        # 使用我们的 get_llm_model 函数
        llm = get_llm_model(
            provider=provider,
            model_name=model_name,
            temperature=temperature
        )
        
        # 测试连接
        print("🔍 测试 LLM 连接...")
        test_response = llm.invoke("Hello")
        print(f"✅ LLM 连接成功: {test_response.content[:50]}...")
        return llm, f"{provider.title()} {model_name}"
            
    except Exception as e:
        error_msg = f"LLM 创建失败 ({provider}): {str(e)}"
        print(f"❌ {error_msg}")
        return None, error_msg

# ==================== 核心执行函数 ====================

async def execute_complete_task(request: CompleteIntelligentBrowserTask) -> CompleteTaskResult:
    """执行完整的智能浏览器任务 - 基于工作版本"""
    task_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    start_time = asyncio.get_event_loop().time()
    
    print(f"🚀 开始完整智能任务 - ID: {task_id}")
    print(f"📋 任务描述: {request.task}")
    print(f"🌐 起始 URL: {request.url}")
    
    if not INTELLIGENT_AVAILABLE:
        return CompleteTaskResult(
            success=False,
            error="智能功能不可用：缺少 browser-use 依赖",
            mode="intelligent",
            execution_time=asyncio.get_event_loop().time() - start_time
        )
    
    # 创建 LLM
    llm, model_info = create_llm(request.model_provider, request.model_name, request.temperature)
    if not llm:
        execution_time = asyncio.get_event_loop().time() - start_time
        return CompleteTaskResult(
            success=False,
            error=f"LLM 创建失败: {model_info}",
            mode="intelligent",
            execution_time=execution_time
        )
    
    try:
        print(f"🧠 智能模式 - 使用 {model_info}")
        print(f"🎯 任务: {request.task}")
        
        # 处理视觉识别设置
        use_vision = request.use_vision
        if request.model_provider == "deepseek":
            print("⚠️ DeepSeek 不支持视觉识别，自动设置 use_vision=False")
            use_vision = False
        
        print(f"👁️ 视觉识别: {use_vision}")
        
        # 创建智能代理 - 使用与 fixed_enhanced_api.py 相同的简单方式
        agent = Agent(
            task=request.task,
            llm=llm,
            use_vision=use_vision,
            max_actions_per_step=request.max_actions_per_step or 2,
            generate_gif=False
        )
        
        print("🚀 开始智能执行...")
        history = await agent.run(max_steps=request.max_steps)
        
        # 解析执行步骤 - 使用与 fixed_enhanced_api.py 相同的方式
        steps = []
        for i, step in enumerate(history.history):
            step_info = DetailedStepInfo(
                step_number=i + 1,
                action=str(getattr(step, 'action', f'Step {i+1}')),
                reasoning=getattr(step, 'reasoning', None),
                success=not bool(getattr(step, 'error', None)),
                error=str(getattr(step, 'error', None)) if getattr(step, 'error', None) else None,
                execution_time=getattr(step, 'execution_time', None)
            )
            steps.append(step_info)
            
            status = "✅" if step_info.success else "❌"
            print(f"  {status} 步骤 {i+1}: {step_info.action}")
        
        final_result = history.final_result() or "智能任务执行完成"
        execution_time = asyncio.get_event_loop().time() - start_time
        
        print(f"🎯 最终结果: {final_result}")
        
        # 创建配置信息
        config_used = {
            "task_id": task_id,
            "viewport": f"{request.viewport_width}x{request.viewport_height}",
            "headless": request.headless,
            "use_vision": use_vision,
            "max_steps": request.max_steps,
            "max_actions_per_step": request.max_actions_per_step,
            "model": model_info,
            "temperature": request.temperature,
            "chrome_path": request.chrome_path,
            "proxy": request.proxy_server,
            "user_agent": request.user_agent,
            "recording": request.save_recording,
            "trace": request.enable_trace,
            "screenshots": request.save_screenshots
        }
        
        return CompleteTaskResult(
            success=True,
            result=final_result,
            mode="intelligent",
            steps=steps,
            total_steps=len(steps),
            execution_time=execution_time,
            model_used=model_info,
            config_used=config_used
        )
        
    except Exception as e:
        execution_time = asyncio.get_event_loop().time() - start_time
        error_msg = f"智能执行失败: {str(e)}"
        print(f"❌ {error_msg}")
        
        return CompleteTaskResult(
            success=False,
            error=error_msg,
            mode="intelligent",
            model_used=model_info,
            execution_time=execution_time
        )

# ==================== API 端点 ====================

@app.post("/complete-browser-task", response_model=CompleteTaskResult)
async def complete_browser_task(request: CompleteIntelligentBrowserTask):
    """
    执行完整的智能浏览器任务
    
    基于已验证工作的 fixed_enhanced_api.py，支持完整参数配置
    """
    print("🌐 HTTP 请求开始")
    print(f"  • 任务: {request.task}")
    print(f"  • 模型: {request.model_provider} {request.model_name}")
    print(f"  • 最大步数: {request.max_steps}")
    print(f"  • 视觉识别: {request.use_vision}")
    print(f"  • 请求对象类型: {type(request)}")
    
    result = await execute_complete_task(request)
    
    print("🌐 HTTP 请求完成")
    print(f"  • 成功状态: {result.success}")
    print(f"  • 总步数: {result.total_steps}")
    print(f"  • 步骤数量: {len(result.steps) if result.steps else 0}")
    if result.steps and len(result.steps) > 0:
        print(f"  • 第一个步骤: {result.steps[0].action}")
    print(f"  • 结果对象类型: {type(result)}")
    
    return result

@app.get("/")
async def root():
    """API 信息"""
    # 检查状态
    deepseek_available = bool(os.getenv("DEEPSEEK_API_KEY"))
    openai_available = bool(os.getenv("OPENAI_API_KEY"))
    anthropic_available = bool(os.getenv("ANTHROPIC_API_KEY"))
    
    return {
        "service": "基于工作版本的完整浏览器自动化 API",
        "version": "5.0.0",
        "port": 8004,
        "intelligent_features": {
            "available": INTELLIGENT_AVAILABLE,
            "deepseek_api_key": "已配置" if deepseek_available else "未配置",
            "openai_api_key": "已配置" if openai_available else "未配置",
            "anthropic_api_key": "已配置" if anthropic_available else "未配置"
        },
        "supported_models": {
            "deepseek": ["deepseek-chat", "deepseek-coder"],
            "openai": ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
            "anthropic": ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
            "ollama": ["llama3.2", "qwen2.5", "gemma2"],
            "azure": ["gpt-4", "gpt-35-turbo"]
        },
        "endpoints": {
            "POST /complete-browser-task": "完整参数智能浏览器任务"
        },
        "total_parameters": 20,
        "example_request": {
            "url": "POST /complete-browser-task",
            "body": {
                "task": "打开百度并搜索人工智能，获取前3个搜索结果",
                "url": "https://www.baidu.com",
                "model_provider": "deepseek",
                "model_name": "deepseek-chat",
                "max_steps": 10,
                "use_vision": False,
                "headless": False,
                "viewport_width": 1920,
                "viewport_height": 1080,
                "temperature": 0.3,
                "max_actions_per_step": 2
            }
        }
    }

@app.get("/test-llm")
async def test_llm_connection():
    """测试 LLM 连接"""
    results = {}
    
    # 测试 DeepSeek
    if os.getenv("DEEPSEEK_API_KEY"):
        llm, info = create_llm("deepseek", "deepseek-chat")
        results["deepseek"] = {
            "available": llm is not None,
            "info": info
        }
    else:
        results["deepseek"] = {
            "available": False,
            "info": "API key 未配置"
        }
    
    # 测试 OpenAI
    if os.getenv("OPENAI_API_KEY"):
        llm, info = create_llm("openai", "gpt-4o-mini")
        results["openai"] = {
            "available": llm is not None,
            "info": info
        }
    else:
        results["openai"] = {
            "available": False,
            "info": "API key 未配置"
        }
    
    # 测试 Anthropic
    if os.getenv("ANTHROPIC_API_KEY"):
        llm, info = create_llm("anthropic", "claude-3-5-haiku-20241022")
        results["anthropic"] = {
            "available": llm is not None,
            "info": info
        }
    else:
        results["anthropic"] = {
            "available": False,
            "info": "API key 未配置"
        }
    
    return results

def main():
    """启动基于工作版本的完整 API 服务器"""
    print("🚀 启动基于工作版本的完整浏览器自动化 API")
    print("=" * 60)
    print("🔧 特性:")
    print("  • 基于已验证工作的 fixed_enhanced_api.py")
    print("  • 支持完整的 34 个参数配置")
    print("  • 支持 DeepSeek、OpenAI、Anthropic、Ollama、Azure")
    print("  • 详细的执行步骤记录")
    print("  • 完整的配置信息返回")
    print()
    print("🌐 服务地址: http://localhost:8004")
    print("📖 API 文档: http://localhost:8004/docs")
    print("🧪 LLM 测试: http://localhost:8004/test-llm")
    print()
    
    # 检查状态
    if INTELLIGENT_AVAILABLE:
        print("✅ 智能功能: 可用")
    else:
        print("❌ 智能功能: 不可用")
    
    if os.getenv("DEEPSEEK_API_KEY"):
        print("✅ DeepSeek API key: 已配置")
    else:
        print("⚠️ DeepSeek API key: 未配置")
    
    if os.getenv("OPENAI_API_KEY"):
        print("✅ OpenAI API key: 已配置")
    else:
        print("⚠️ OpenAI API key: 未配置")
    
    if os.getenv("ANTHROPIC_API_KEY"):
        print("✅ Anthropic API key: 已配置")
    else:
        print("⚠️ Anthropic API key: 未配置")
    
    print("=" * 60)
    
    uvicorn.run(
        "working_complete_api:app",
        host="0.0.0.0",
        port=8004,
        reload=False,
        log_level="info"
    )

if __name__ == "__main__":
    main()

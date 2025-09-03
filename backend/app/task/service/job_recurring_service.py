"""
Job Recurring Service - 循环任务处理服务
用于处理系统级循环任务，支持GitHub Actions定时触发
"""
import asyncio
import logging
import os
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from uuid import UUID

from dotenv import load_dotenv
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, create_engine, select
from supabase import Client, create_client

from ..models import AgentTasks
from ..schemas import JobAgentRequest
from .job_agent_service import JobAgentService
from ...db.models import Resumes

logger = logging.getLogger(__name__)
load_dotenv()

# 配置常量
MAX_CONCURRENT_TASKS = 100
security = HTTPBearer()


class ServiceRoleDatabase:
    """Service Role数据库连接管理器 - 绕过RLS限制"""
    
    def __init__(self):
        self.service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.db_string = os.getenv("SUPABASE_DB_STRING")
        
        if not all([self.service_role_key, self.supabase_url, self.db_string]):
            raise ValueError("Missing required service role environment variables")
        
        # 创建Service Role数据库引擎
        self.engine = create_engine(self.db_string)
        
        # 创建Service Role Supabase客户端
        self.supabase_client = create_client(self.supabase_url, self.service_role_key)
        
        logger.info("Service Role database connections initialized")
    
    def get_session(self):
        """获取Service Role数据库会话"""
        return Session(self.engine)


class TaskProcessor:
    """任务处理器 - 封装循环任务业务逻辑"""
    
    def __init__(self, service_db: ServiceRoleDatabase):
        self.service_db = service_db
    
    async def process_single_task(self, task: AgentTasks, db: Session) -> Dict[str, Any]:
        """
        处理单个循环任务
        
        Args:
            task: 要处理的任务
            db: 数据库会话
            
        Returns:
            处理结果
        """
        try:
            logger.info(f"Starting recurring task {task.id} for user {task.user_id}")
            
            # 1. 验证任务指令
            instructions = task.task_instructions or {}
            required_fields = ["job_titles", "location", "job_required", "resume_id", "ai_model"]
            
            for field in required_fields:
                if field not in instructions:
                    raise ValueError(f"Missing required field in task_instructions: {field}")
            
            # 2. 验证简历存在
            resume = self._get_user_resume(db, task.user_id, UUID(instructions["resume_id"]))
            if not resume:
                raise ValueError(f"Resume {instructions['resume_id']} not found for user {task.user_id}")
            
            # 3. 构造JobAgentRequest
            job_request = JobAgentRequest(
                job_titles=instructions["job_titles"],
                location=instructions["location"],
                job_required=instructions["job_required"],
                resume_id=UUID(instructions["resume_id"]),
                ai_model=instructions["ai_model"],
                task_description=f"Recurring task: {task.task_description}"
            )
            
            # 4. 创建JobAgentService并执行任务
            job_agent_service = JobAgentService(ai_model=instructions["ai_model"])
            
            # 使用常规数据库会话执行任务（JobAgentService内部会处理用户权限）
            with Session(self.service_db.engine) as regular_session:
                result = await job_agent_service.execute_job_agent_task(
                    db=regular_session,
                    user_id=task.user_id,
                    job_request=job_request
                )
            
            # 5. 更新循环任务状态（保持recurring状态）
            self._update_recurring_task_after_execution(db, task)
            
            logger.info(f"Recurring task {task.id} completed successfully")
            return {
                "task_id": task.id,
                "user_id": task.user_id,
                "success": True,
                "jobs_found": result.get("jobs_found", 0),
                "processing_time": result.get("processing_time", 0)
            }
            
        except Exception as e:
            logger.error(f"Error processing recurring task {task.id}: {e}")
            
            # 记录错误但不改变任务状态（仍可继续循环）
            self._update_recurring_task_after_execution(db, task, error_message=str(e))
            
            return {
                "task_id": task.id,
                "user_id": task.user_id,
                "success": False,
                "error": str(e)
            }
    
    def _get_user_resume(self, db: Session, user_id: UUID, resume_id: UUID) -> Optional[Resumes]:
        """获取用户简历（使用Service Role权限）"""
        try:
            resume = db.exec(
                select(Resumes).where(
                    Resumes.id == resume_id,
                    Resumes.user_id == user_id
                )
            ).first()
            return resume
        except Exception as e:
            logger.error(f"Error getting resume {resume_id} for user {user_id}: {e}")
            return None
    
    def _update_recurring_task_after_execution(
        self, 
        db: Session, 
        task: AgentTasks, 
        error_message: Optional[str] = None
    ):
        """执行后更新循环任务状态"""
        try:
            # 更新执行计数和时间
            task.execution_count += 1
            task.last_execution_at = datetime.now()
            
            # 计算下一次执行时间
            task.next_execution_at = self._calculate_next_execution_time(
                task.last_execution_at, 
                task.recurrence_config
            )
            
            # 记录错误信息（如果有）
            if error_message:
                task.other_message = f"Last execution error: {error_message}"
            else:
                task.other_message = None
            
            # 检查是否达到最大执行次数
            if task.max_executions and task.execution_count >= task.max_executions:
                task.is_active = False
                task.status = "completed"
                logger.info(f"Task {task.id} reached max executions ({task.max_executions}), marked as completed")
            
            task.updated_at = datetime.now()
            
            db.add(task)
            db.commit()
            db.refresh(task)
            
            logger.info(f"Updated recurring task {task.id}, next execution: {task.next_execution_at}")
            
        except Exception as e:
            logger.error(f"Error updating recurring task {task.id} after execution: {e}")
            db.rollback()
    
    def _calculate_next_execution_time(
        self, 
        last_execution: datetime, 
        recurrence_config: Dict[str, Any]
    ) -> datetime:
        """
        计算下一次执行时间
        
        根据用户需求：基于上次执行时间 + 间隔，向下取整到下一个整数小时
        例如：1:36 + 6小时 = 7:36，向下取整为 7:00
        """
        try:
            if not recurrence_config or recurrence_config.get("unit") != "hours":
                raise ValueError("Only 'hours' unit is supported for recurrence")
            
            interval_hours = recurrence_config.get("value", 1)
            if not isinstance(interval_hours, int) or interval_hours <= 0:
                raise ValueError("Recurrence value must be a positive integer")
            
            # 计算原始的下次执行时间
            raw_next_time = last_execution + timedelta(hours=interval_hours)
            
            # 向下取整到整数小时（分钟和秒设为0）
            next_execution = raw_next_time.replace(minute=0, second=0, microsecond=0)
            
            # 如果向下取整后的时间早于或等于原始时间，则推进到下一个小时
            if next_execution <= raw_next_time:
                next_execution = next_execution
            
            logger.debug(f"Calculated next execution: {last_execution} + {interval_hours}h = {raw_next_time} -> {next_execution}")
            return next_execution
            
        except Exception as e:
            logger.error(f"Error calculating next execution time: {e}")
            # 默认1小时后再试
            return last_execution + timedelta(hours=1)


class JobRecurringService:
    """循环任务服务 - 主要业务逻辑协调器"""
    
    def __init__(self):
        self.service_db = ServiceRoleDatabase()
        self.task_processor = TaskProcessor(self.service_db)
    
    async def process_all_recurring_tasks(self) -> Dict[str, Any]:
        """
        处理所有待执行的循环任务
        
        Returns:
            处理结果汇总
        """
        start_time = time.time()
        total_tasks = 0
        successful_tasks = 0
        failed_tasks = 0
        
        try:
            logger.info("Starting batch processing of recurring tasks")
            
            # 1. 查询待执行的循环任务
            with self.service_db.get_session() as db:
                pending_tasks = self._get_pending_recurring_tasks(db)
                total_tasks = len(pending_tasks)
                
                if total_tasks == 0:
                    logger.info("No pending recurring tasks found")
                    return self._build_summary_result(0, 0, 0, time.time() - start_time)
                
                logger.info(f"Found {total_tasks} pending recurring tasks")
                
                # 2. 控制并发数量
                if total_tasks > MAX_CONCURRENT_TASKS:
                    logger.warning(f"Too many tasks ({total_tasks}), limiting to {MAX_CONCURRENT_TASKS}")
                    pending_tasks = pending_tasks[:MAX_CONCURRENT_TASKS]
                    total_tasks = MAX_CONCURRENT_TASKS
                
                # 3. 异步批量处理任务
                semaphore = asyncio.Semaphore(MAX_CONCURRENT_TASKS)
                tasks = []
                
                for task in pending_tasks:
                    task_coroutine = self._process_single_task_with_semaphore(
                        semaphore, task, db
                    )
                    tasks.append(task_coroutine)
                
                # 等待所有任务完成
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # 4. 统计结果
                for result in results:
                    if isinstance(result, Exception):
                        failed_tasks += 1
                        logger.error(f"Task failed with exception: {result}")
                    elif isinstance(result, dict) and result.get("success"):
                        successful_tasks += 1
                    else:
                        failed_tasks += 1
                
                processing_time = time.time() - start_time
                logger.info(f"Batch processing completed: {successful_tasks}/{total_tasks} successful in {processing_time:.2f}s")
                
                return self._build_summary_result(total_tasks, successful_tasks, failed_tasks, processing_time)
                
        except Exception as e:
            logger.error(f"Error in batch processing recurring tasks: {e}")
            processing_time = time.time() - start_time
            return {
                "success": False,
                "error": str(e),
                "total_tasks": total_tasks,
                "successful_tasks": successful_tasks,
                "failed_tasks": failed_tasks,
                "processing_time": processing_time
            }
    
    async def _process_single_task_with_semaphore(
        self, 
        semaphore: asyncio.Semaphore, 
        task: AgentTasks, 
        db: Session
    ) -> Dict[str, Any]:
        """使用信号量控制并发的任务处理"""
        async with semaphore:
            return await self.task_processor.process_single_task(task, db)
    
    def _get_pending_recurring_tasks(self, db: Session) -> List[AgentTasks]:
        """查询待执行的循环任务（使用Service Role权限）"""
        try:
            now = datetime.now()
            
            tasks = db.exec(
                select(AgentTasks).where(
                    AgentTasks.is_recurring == True,
                    AgentTasks.is_active == True,
                    AgentTasks.status == "recurring",
                    AgentTasks.next_execution_at <= now
                ).order_by(AgentTasks.next_execution_at)
            ).all()
            
            logger.info(f"Found {len(tasks)} pending recurring tasks")
            return list(tasks)
            
        except Exception as e:
            logger.error(f"Error querying pending recurring tasks: {e}")
            return []
    
    def _build_summary_result(
        self, 
        total: int, 
        successful: int, 
        failed: int, 
        processing_time: float
    ) -> Dict[str, Any]:
        """构建处理结果汇总"""
        return {
            "success": True,
            "message": f"Processed {total} recurring tasks: {successful} successful, {failed} failed",
            "total_tasks": total,
            "successful_tasks": successful,
            "failed_tasks": failed,
            "processing_time": round(processing_time, 2),
            "timestamp": datetime.now().isoformat()
        }


# API认证依赖函数
async def verify_api_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> bool:
    """
    验证API Token - 用于GitHub Actions等系统调用的认证
    
    Args:
        credentials: HTTP Bearer认证凭据
        
    Returns:
        验证成功返回True
        
    Raises:
        HTTPException: 认证失败
    """
    try:
        expected_token = os.getenv("API_AUTH_TOKEN")
        
        if not expected_token:
            logger.error("API_AUTH_TOKEN not configured")
            raise HTTPException(
                status_code=500, 
                detail="API authentication not properly configured"
            )
        
        if not credentials or credentials.scheme.lower() != "bearer":
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication scheme"
            )
        
        if credentials.credentials != expected_token:
            logger.warning("Invalid API token provided")
            raise HTTPException(
                status_code=401,
                detail="Invalid API token"
            )
        
        logger.info("API token verified successfully")
        return True
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying API token: {e}")
        raise HTTPException(
            status_code=500,
            detail="Authentication verification failed"
        )

"""
Job Recurring First Service - 用户级循环任务创建和首次执行服务
用于用户创建循环任务并立即执行第一次，后续由系统自动处理
"""
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any
from uuid import UUID

from sqlmodel import Session

from ..models import AgentTasks
from ..schemas import (
    JobRecurringFirstRequest, 
    JobRecurringFirstResponse,
    AgentTaskCreate,
    AgentTaskUpdate
)
from .job_agent_service import JobAgentService
from .task_service import TaskService

logger = logging.getLogger(__name__)


class JobRecurringFirstService:
    """用户级循环任务创建和首次执行服务"""
    
    def __init__(self):
        pass
    
    async def create_and_execute_recurring_task(
        self,
        db: Session,
        user_id: UUID,
        recurring_request: JobRecurringFirstRequest
    ) -> Dict[str, Any]:
        """
        创建循环任务并立即执行第一次
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            recurring_request: 循环任务创建请求
            
        Returns:
            创建和执行结果
        """
        task = None
        start_time = time.time()
        
        try:
            logger.info(f"Creating recurring task for user {user_id}")
            
            # 1. 验证循环配置
            self._validate_recurrence_config(recurring_request.recurrence_config)
            
            # 2. 创建循环任务记录
            task = self._create_recurring_task_record(db, user_id, recurring_request)
            logger.info(f"Created recurring task {task.id}")
            
            # 3. 更新任务状态为运行中
            TaskService.update_agent_task(
                db, task.id, user_id,
                AgentTaskUpdate(
                    status="running",
                    started_at=datetime.now()
                )
            )
            
            # 4. 执行第一次任务
            first_execution_result = await self._execute_first_task(
                db, user_id, task, recurring_request
            )
            
            # 5. 更新任务为循环状态并计算下次执行时间
            self._finalize_recurring_task(db, task)
            
            # 6. 构建响应
            processing_time = time.time() - start_time
            response = self._build_response(
                task, first_execution_result, processing_time
            )
            
            logger.info(f"Recurring task {task.id} created and first execution completed")
            return response
            
        except Exception as e:
            logger.error(f"Error creating recurring task: {e}")
            
            # 清理失败的任务记录
            if task:
                try:
                    TaskService.update_agent_task(
                        db, task.id, user_id,
                        AgentTaskUpdate(
                            status="failed",
                            completed_at=datetime.now(),
                            other_message=f"Creation failed: {str(e)}",
                            is_active=False
                        )
                    )
                except Exception as cleanup_error:
                    logger.error(f"Failed to cleanup task: {cleanup_error}")
            
            raise
    
    def _validate_recurrence_config(self, recurrence_config: Dict[str, Any]):
        """验证循环配置"""
        if not recurrence_config:
            raise ValueError("recurrence_config is required")
        
        unit = recurrence_config.get("unit")
        value = recurrence_config.get("value")
        
        if unit != "hours":
            raise ValueError("Only 'hours' unit is supported for recurrence")
        
        if not isinstance(value, int) or value <= 0:
            raise ValueError("Recurrence value must be a positive integer")
        
        if value > 168:  # 最多7天
            raise ValueError("Recurrence value cannot exceed 168 hours (7 days)")
    
    def _create_recurring_task_record(
        self,
        db: Session,
        user_id: UUID,
        recurring_request: JobRecurringFirstRequest
    ) -> AgentTasks:
        """创建循环任务数据库记录"""
        try:
            # 构建任务指令
            task_instructions = {
                "job_titles": recurring_request.job_titles,
                "location": recurring_request.location,
                "job_required": recurring_request.job_required,
                "resume_id": str(recurring_request.resume_id),
                "ai_model": recurring_request.ai_model
            }
            
            # 创建任务描述
            if not recurring_request.task_description:
                task_description = (
                    f"Recurring Job Search: {', '.join(recurring_request.job_titles)} "
                    f"in {recurring_request.location} "
                    f"(every {recurring_request.recurrence_config['value']} hours)"
                )
            else:
                task_description = recurring_request.task_description
            
            # 创建任务记录
            task_create = AgentTaskCreate(
                task_type="job_agent_recurring",
                task_description=task_description,
                task_instructions=task_instructions,
                is_recurring=True,
                recurrence_config=recurring_request.recurrence_config,
                max_executions=recurring_request.max_executions
            )
            
            task = TaskService.create_agent_task(db, user_id, task_create)
            return task
            
        except Exception as e:
            logger.error(f"Error creating recurring task record: {e}")
            raise
    
    async def _execute_first_task(
        self,
        db: Session,
        user_id: UUID,
        task: AgentTasks,
        recurring_request: JobRecurringFirstRequest
    ) -> Dict[str, Any]:
        """执行第一次任务"""
        try:
            logger.info(f"Executing first task for recurring task {task.id}")
            
            # 创建 JobAgentService
            job_agent_service = JobAgentService(ai_model=recurring_request.ai_model)
            
            # 构建 JobAgentRequest（复用现有逻辑）
            from ..schemas import JobAgentRequest
            job_request = JobAgentRequest(
                job_titles=recurring_request.job_titles,
                location=recurring_request.location,
                job_required=recurring_request.job_required,
                resume_id=recurring_request.resume_id,
                ai_model=recurring_request.ai_model,
                task_description="First execution of recurring task"
            )
            
            # 执行任务（但不更新这个任务的状态，因为我们要保持它为循环状态）
            # 我们需要执行具体的逻辑但不让它改变我们的循环任务状态
            execution_result = await self._execute_job_agent_logic_without_status_change(
                db, user_id, job_request, task.id
            )
            
            return execution_result
            
        except Exception as e:
            logger.error(f"Error executing first task: {e}")
            raise
    
    async def _execute_job_agent_logic_without_status_change(
        self,
        db: Session,
        user_id: UUID,
        job_request,
        recurring_task_id: UUID
    ) -> Dict[str, Any]:
        """
        执行job agent逻辑但不改变循环任务的状态
        这里我们复用job_agent_service的核心逻辑，但跳过状态管理部分
        """
        try:
            # 直接使用JobAgentService的内部逻辑
            job_agent_service = JobAgentService(ai_model=job_request.ai_model)
            
            # 1. 验证简历存在
            resume = await job_agent_service._get_user_resume(db, user_id, job_request.resume_id)
            if not resume:
                raise ValueError(f"Resume {job_request.resume_id} not found or not accessible")
            
            # 2. 执行爬虫阶段
            logger.info(f"Starting scraping phase for recurring task {recurring_task_id}")
            from .seek_scraper_service import SeekScraperService
            scraper_service = SeekScraperService()
            
            jobs_found = await scraper_service.scrape_jobs_async(
                job_titles=job_request.job_titles,
                location=job_request.location,
                job_required=job_request.job_required,
                task_id=recurring_task_id,
                user_id=user_id,
                db=db
            )
            
            logger.info(f"Scraping completed: found {len(jobs_found)} jobs")
            
            # 3. 执行AI匹配分析阶段
            if jobs_found:
                logger.info(f"Starting AI analysis phase for {len(jobs_found)} jobs")
                analysis_results = await job_agent_service._analyze_jobs_with_resume(
                    db, resume, jobs_found, recurring_task_id
                )
                
                successful_analyses = sum(1 for r in analysis_results if r.analysis_success)
                failed_analyses = len(jobs_found) - successful_analyses
                average_score = job_agent_service._calculate_average_score(analysis_results)
                
                logger.info(f"AI analysis completed: {successful_analyses} successful, {failed_analyses} failed")
            else:
                successful_analyses = 0
                failed_analyses = 0
                average_score = 0.0
                logger.warning("No jobs found to analyze")
            
            return {
                "jobs_found": len(jobs_found),
                "jobs_analyzed": len(jobs_found),
                "successful_analyses": successful_analyses,
                "failed_analyses": failed_analyses,
                "average_score": average_score,
                "resume_id": job_request.resume_id,
                "ai_model": job_request.ai_model
            }
            
        except Exception as e:
            logger.error(f"Error in job agent logic execution: {e}")
            raise
    
    def _finalize_recurring_task(self, db: Session, task: AgentTasks):
        """完成循环任务设置"""
        try:
            # 计算下一次执行时间
            current_time = datetime.now()
            next_execution = self._calculate_next_execution_time(
                current_time, 
                task.recurrence_config
            )
            
            # 更新任务为循环状态
            task.status = "recurring"
            task.execution_count = 1
            task.last_execution_at = current_time
            task.next_execution_at = next_execution
            task.is_active = True
            task.completed_at = None  # 循环任务不设置完成时间
            task.updated_at = current_time
            
            db.add(task)
            db.commit()
            db.refresh(task)
            
            logger.info(f"Finalized recurring task {task.id}, next execution: {next_execution}")
            
        except Exception as e:
            logger.error(f"Error finalizing recurring task: {e}")
            db.rollback()
            raise
    
    def _calculate_next_execution_time(
        self, 
        last_execution: datetime, 
        recurrence_config: Dict[str, Any]
    ) -> datetime:
        """
        计算下一次执行时间（复用循环服务的逻辑）
        """
        try:
            interval_hours = recurrence_config.get("value", 1)
            
            # 计算原始的下次执行时间
            raw_next_time = last_execution + timedelta(hours=interval_hours)
            
            # 向下取整到整数小时（分钟和秒设为0）
            next_execution = raw_next_time.replace(minute=0, second=0, microsecond=0)
            
            logger.debug(f"Calculated next execution: {last_execution} + {interval_hours}h = {raw_next_time} -> {next_execution}")
            return next_execution
            
        except Exception as e:
            logger.error(f"Error calculating next execution time: {e}")
            # 默认1小时后再试
            return last_execution + timedelta(hours=1)
    
    def _build_response(
        self,
        task: AgentTasks,
        first_execution_result: Dict[str, Any],
        processing_time: float
    ) -> Dict[str, Any]:
        """构建响应数据"""
        return {
            "task_id": task.id,
            "message": f"Recurring task created and first execution completed. Next execution at {task.next_execution_at}",
            
            # 首次执行结果
            "first_execution": first_execution_result,
            "jobs_found": first_execution_result.get("jobs_found", 0),
            "jobs_analyzed": first_execution_result.get("jobs_analyzed", 0),
            "successful_analyses": first_execution_result.get("successful_analyses", 0),
            "failed_analyses": first_execution_result.get("failed_analyses", 0),
            "resume_id": first_execution_result.get("resume_id"),
            "ai_model": first_execution_result.get("ai_model"),
            "average_score": first_execution_result.get("average_score", 0.0),
            "processing_time": round(processing_time, 2),
            
            # 循环任务配置
            "is_recurring": task.is_recurring,
            "recurrence_config": task.recurrence_config,
            "max_executions": task.max_executions,
            "execution_count": task.execution_count,
            "next_execution_at": task.next_execution_at,
            
            # 任务状态
            "status": task.status,
            "is_active": task.is_active
        }

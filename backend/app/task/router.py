"""
Task API router.
This module contains API endpoints for task management and scraper operations.
"""
import logging
import math
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Depends

from .dependencies import DBSessionDependency, UserDependency
from .schemas import (
    AgentTaskCreate, AgentTaskUpdate, AgentTaskResponse,
    AgentFoundJobResponse, AgentFoundJobUpdate,
    SeekScraperRequest, SeekScraperResponse,
    ResumeJobMatchingRequest, ResumeJobMatchingResponse,
    JobAgentRequest, JobAgentResponse,
    JobRecurringFirstRequest, JobRecurringFirstResponse
)
from .service import TaskService, JobAgentService
from .service.job_recurring_service import JobRecurringService, verify_api_token
from .service.job_recurring_first_service import JobRecurringFirstService
from ..db.models import Resumes
from sqlmodel import select

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/seek-scraper", response_model=SeekScraperResponse, tags=["tasks"])
async def run_seek_scraper(
    scraper_request: SeekScraperRequest,
    current_user: UserDependency,
    db: DBSessionDependency,
    background_tasks: BackgroundTasks
):
    """
    Execute Seek scraper to find jobs.
    This endpoint creates a task and runs the scraper asynchronously.
    """
    try:
        logger.info(f"Starting seek scraper for user {current_user.id}")
        
        # Execute scraper asynchronously
        result = await TaskService.execute_seek_scraper(
            db=db,
            user_id=current_user.id,
            scraper_request=scraper_request
        )
        
        return SeekScraperResponse(**result)
        
    except Exception as e:
        logger.error(f"Error in seek scraper endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/resume-job-matching", response_model=ResumeJobMatchingResponse, tags=["tasks"])
async def run_resume_job_matching(
    matching_request: ResumeJobMatchingRequest,
    current_user: UserDependency,
    db: DBSessionDependency,
    background_tasks: BackgroundTasks
):
    """
    Execute resume-job matching analysis using AI.
    This endpoint analyzes how well a resume matches jobs from a scraping task.
    """
    try:
        logger.info(f"Starting resume-job matching for user {current_user.id}")
        
        # Execute matching asynchronously
        result = await TaskService.execute_resume_job_matching(
            db=db,
            user_id=current_user.id,
            matching_request=matching_request
        )
        
        return ResumeJobMatchingResponse(**result)
        
    except Exception as e:
        logger.error(f"Error in resume-job matching endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/job-agent", response_model=JobAgentResponse, tags=["tasks"])
async def run_job_agent(
    job_request: JobAgentRequest,
    current_user: UserDependency,
    db: DBSessionDependency,
    background_tasks: BackgroundTasks
):
    """
    Execute Job Agent - 综合任务：爬虫 + AI 匹配一体化
    
    这个端点结合了 Seek 爬虫和 AI 简历匹配功能：
    1. 根据职位标题和地点爬取指定数量的工作
    2. 使用指定的简历对找到的工作进行 AI 匹配分析
    3. 返回完整的分析结果
    """
    try:
        logger.info(f"Starting job agent task for user {current_user.id}")
        
        # 创建 JobAgentService 实例
        job_agent_service = JobAgentService(ai_model=job_request.ai_model)
        
        # 执行综合任务
        result = await job_agent_service.execute_job_agent_task(
            db=db,
            user_id=current_user.id,
            job_request=job_request
        )
        
        return JobAgentResponse(**result)
        
    except Exception as e:
        logger.error(f"Error in job agent endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/resumes/", tags=["resumes"])
def get_user_resumes(
    current_user: UserDependency,
    db: DBSessionDependency
):
    """
    Get all resumes for the current user.
    This endpoint is used by the resume-job matching feature.
    """
    try:
        logger.info(f"Getting resumes for user {current_user.id}")
        
        # Query resumes for current user
        resumes = db.exec(
            select(Resumes).where(Resumes.user_id == current_user.id)
            .order_by(Resumes.created_at.desc())
        ).all()
        
        # Convert to dict format for frontend compatibility
        resume_list = []
        for resume in resumes:
            resume_dict = {
                "id": str(resume.id),
                "user_id": str(resume.user_id),
                "name": resume.name,
                "first_name": resume.first_name,
                "last_name": resume.last_name,
                "email": resume.email,
                "phone_number": resume.phone_number,
                "location": resume.location,
                "website": resume.website,
                "linkedin_url": resume.linkedin_url,
                "github_url": resume.github_url,
                "professional_summary": resume.professional_summary,
                "work_experience": resume.work_experience or [],
                "education": resume.education or [],
                "skills": resume.skills or [],
                "projects": resume.projects or [],
                "certifications": resume.certifications or [],
                "target_role": resume.target_role,
                "resume_title": resume.resume_title,
                "created_at": resume.created_at.isoformat(),
                "updated_at": resume.updated_at.isoformat()
            }
            resume_list.append(resume_dict)
        
        logger.info(f"Found {len(resume_list)} resumes for user {current_user.id}")
        return resume_list
        
    except Exception as e:
        logger.error(f"Error getting resumes for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=list[AgentTaskResponse], tags=["tasks"])
def get_user_tasks(
    current_user: UserDependency,
    db: DBSessionDependency,
    status: Optional[str] = Query(None, description="Filter by task status"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page")
):
    """Get user's agent tasks with optional filtering and pagination."""
    try:
        tasks, total = TaskService.get_user_tasks(
            db=db,
            user_id=current_user.id,
            status=status,
            page=page,
            per_page=per_page
        )
        
        return [AgentTaskResponse.model_validate(task) for task in tasks]
        
    except Exception as e:
        logger.error(f"Error getting user tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{task_id}", response_model=AgentTaskResponse, tags=["tasks"])
def get_task(
    task_id: UUID,
    current_user: UserDependency,
    db: DBSessionDependency
):
    """Get a specific task by ID."""
    try:
        from sqlmodel import select
        from .models import AgentTasks
        
        task = db.exec(
            select(AgentTasks).where(
                AgentTasks.id == task_id,
                AgentTasks.user_id == current_user.id
            )
        ).first()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return AgentTaskResponse.model_validate(task)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{task_id}", response_model=AgentTaskResponse, tags=["tasks"])
def update_task(
    task_id: UUID,
    task_update: AgentTaskUpdate,
    current_user: UserDependency,
    db: DBSessionDependency
):
    """Update a task."""
    try:
        task = TaskService.update_agent_task(
            db=db,
            task_id=task_id,
            user_id=current_user.id,
            task_update=task_update
        )
        
        return AgentTaskResponse.model_validate(task)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating task {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/found-jobs/", response_model=list[AgentFoundJobResponse], tags=["found-jobs"])
def get_found_jobs(
    current_user: UserDependency,
    db: DBSessionDependency,
    task_id: Optional[UUID] = Query(None, description="Filter by task ID"),
    saved_only: Optional[bool] = Query(None, description="Filter by saved status"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page")
):
    """Get agent found jobs with optional filtering and pagination."""
    try:
        jobs, total = TaskService.get_agent_found_jobs(
            db=db,
            user_id=current_user.id,
            task_id=task_id,
            saved_only=saved_only,
            page=page,
            per_page=per_page
        )
        
        return [AgentFoundJobResponse.model_validate(job) for job in jobs]
        
    except Exception as e:
        logger.error(f"Error getting found jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/found-jobs/{job_id}", response_model=AgentFoundJobResponse, tags=["found-jobs"])
def update_found_job(
    job_id: UUID,
    job_update: AgentFoundJobUpdate,
    current_user: UserDependency,
    db: DBSessionDependency
):
    """Update a found job (e.g., mark as saved)."""
    try:
        from sqlmodel import select
        from .models import AgentFoundJobs
        
        # Get the job
        job = db.exec(
            select(AgentFoundJobs).where(
                AgentFoundJobs.id == job_id,
                AgentFoundJobs.user_id == current_user.id
            )
        ).first()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Update fields
        update_data = job_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(job, key, value)
        
        from datetime import datetime
        job.updated_at = datetime.now()
        
        db.add(job)
        db.commit()
        db.refresh(job)
        
        return AgentFoundJobResponse.model_validate(job)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating found job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/found-jobs/{job_id}", response_model=AgentFoundJobResponse, tags=["found-jobs"])
def get_found_job(
    job_id: UUID,
    current_user: UserDependency,
    db: DBSessionDependency
):
    """Get a specific found job by ID."""
    try:
        from sqlmodel import select
        from .models import AgentFoundJobs
        
        job = db.exec(
            select(AgentFoundJobs).where(
                AgentFoundJobs.id == job_id,
                AgentFoundJobs.user_id == current_user.id
            )
        ).first()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return AgentFoundJobResponse.model_validate(job)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting found job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recurring-first", response_model=JobRecurringFirstResponse, tags=["recurring-tasks"])
async def create_recurring_task(
    recurring_request: JobRecurringFirstRequest,
    current_user: UserDependency,
    db: DBSessionDependency,
    background_tasks: BackgroundTasks
):
    """
    创建循环任务并立即执行第一次
    
    这是用户级接口，用于创建新的循环任务：
    1. 创建循环任务记录
    2. 立即执行第一次任务（包含爬虫+AI匹配）
    3. 计算下一次执行时间
    4. 后续由GitHub Actions自动触发执行
    
    功能：
    - 复用Job Agent的完整逻辑
    - 支持自定义循环间隔（小时为单位）
    - 支持最大执行次数限制
    - 立即执行并返回结果
    
    认证：普通用户Token认证
    """
    try:
        logger.info(f"Creating recurring task for user {current_user.id}")
        
        # 创建循环任务首次执行服务
        recurring_first_service = JobRecurringFirstService()
        
        # 执行创建和首次执行
        result = await recurring_first_service.create_and_execute_recurring_task(
            db=db,
            user_id=current_user.id,
            recurring_request=recurring_request
        )
        
        return JobRecurringFirstResponse(**result)
        
    except Exception as e:
        logger.error(f"Error in recurring task creation endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recurring-jobs", tags=["recurring-tasks"])
async def process_recurring_jobs(
    _: bool = Depends(verify_api_token)
):
    """
    处理所有待执行的循环任务
    
    这是一个系统级接口，供GitHub Actions等自动化服务调用。
    要求Bearer Token认证，处理所有用户的循环任务。
    
    功能：
    1. 查询所有待执行的循环任务
    2. 批量异步执行任务（复用job-agent逻辑）
    3. 更新执行记录和下次执行时间
    4. 管理任务生命周期（最大执行次数控制）
    
    认证：需要在请求头中包含 Authorization: Bearer {API_AUTH_TOKEN}
    """
    try:
        logger.info("Starting recurring jobs processing via API")
        
        # 创建循环任务服务
        recurring_service = JobRecurringService()
        
        # 处理所有待执行的循环任务
        result = await recurring_service.process_all_recurring_tasks()
        
        logger.info(f"Recurring jobs processing completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error in recurring jobs processing endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Recurring jobs processing failed: {str(e)}")

"""
Job Agent Service - 综合任务服务
结合 Seek 爬虫和 AI 简历匹配功能，提供一站式求职分析服务。
"""
import asyncio
import logging
import time
from datetime import datetime
from typing import Dict, Any, List
from uuid import UUID

from sqlmodel import Session, select

from ..models import AgentTasks, AgentFoundJobs
from ..schemas import JobAgentRequest, AgentTaskCreate, AgentTaskUpdate, JobMatchingResult
from .seek_scraper_service import SeekScraperService
from .resume_matching_service import ResumeMatchingService
from .task_service import TaskService
from ..utils.llm_client import create_llm_client
from ..utils.prompts import get_matching_prompt, extract_resume_summary, extract_job_summary
from ...db.models import Resumes

logger = logging.getLogger(__name__)


class JobAgentService:
    """综合任务服务 - 爬虫 + AI 匹配一体化"""
    
    def __init__(self, ai_model: str = "deepseek"):
        self.ai_model = ai_model
        self.llm_client = create_llm_client(ai_model)
    
    async def execute_job_agent_task(
        self,
        db: Session,
        user_id: UUID,
        job_request: JobAgentRequest
    ) -> Dict[str, Any]:
        """
        执行综合任务：爬虫 + AI 匹配
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            job_request: 任务请求参数
            
        Returns:
            综合任务执行结果
        """
        task = None
        start_time = time.time()
        
        try:
            # 1. 验证简历存在
            resume = await self._get_user_resume(db, user_id, job_request.resume_id)
            if not resume:
                raise ValueError(f"Resume {job_request.resume_id} not found or not accessible")
            
            # 2. 创建综合任务
            task_create = AgentTaskCreate(
                task_type="job_agent",
                task_description=job_request.task_description or f"Job Agent: Find {job_request.job_required} jobs and analyze with resume {resume.name}",
                task_instructions={
                    "job_titles": job_request.job_titles,
                    "location": job_request.location,
                    "job_required": job_request.job_required,
                    "resume_id": str(job_request.resume_id),
                    "ai_model": job_request.ai_model
                }
            )
            
            task = TaskService.create_agent_task(db, user_id, task_create)
            logger.info(f"Created job agent task {task.id} for user {user_id}")
            
            # 3. 更新任务状态为运行中
            TaskService.update_agent_task(
                db, task.id, user_id,
                AgentTaskUpdate(status="running", started_at=datetime.now())
            )
            
            # 4. 执行爬虫阶段
            logger.info(f"Starting scraping phase for task {task.id}")
            scraper_service = SeekScraperService()
            jobs_found = await scraper_service.scrape_jobs_async(
                job_titles=job_request.job_titles,
                location=job_request.location,
                job_required=job_request.job_required,
                task_id=task.id,
                user_id=user_id,
                db=db
            )
            
            logger.info(f"Scraping completed: found {len(jobs_found)} jobs")
            
            # 5. 执行AI匹配分析阶段
            if jobs_found:
                logger.info(f"Starting AI analysis phase for {len(jobs_found)} jobs")
                analysis_results = await self._analyze_jobs_with_resume(
                    db, resume, jobs_found, task.id
                )
                
                successful_analyses = sum(1 for r in analysis_results if r.analysis_success)
                failed_analyses = len(jobs_found) - successful_analyses
                average_score = self._calculate_average_score(analysis_results)
                
                logger.info(f"AI analysis completed: {successful_analyses} successful, {failed_analyses} failed")
            else:
                successful_analyses = 0
                failed_analyses = 0
                average_score = 0.0
                logger.warning("No jobs found to analyze")
            
            # 6. 更新任务状态为完成
            processing_time = time.time() - start_time
            TaskService.update_agent_task(
                db, task.id, user_id,
                AgentTaskUpdate(
                    status="completed",
                    completed_at=datetime.now(),
                    execution_result={
                        "jobs_found": len(jobs_found),
                        "jobs_analyzed": len(jobs_found),
                        "successful_analyses": successful_analyses,
                        "failed_analyses": failed_analyses,
                        "resume_id": str(job_request.resume_id),
                        "ai_model": job_request.ai_model,
                        "average_score": average_score,
                        "processing_time_seconds": round(processing_time, 2),
                        "job_titles": job_request.job_titles,
                        "location": job_request.location
                    }
                )
            )
            
            return {
                "task_id": task.id,
                "message": f"Job Agent completed: found {len(jobs_found)} jobs, analyzed {successful_analyses} successfully",
                "jobs_found": len(jobs_found),
                "jobs_analyzed": len(jobs_found),
                "successful_analyses": successful_analyses,
                "failed_analyses": failed_analyses,
                "resume_id": job_request.resume_id,
                "ai_model": job_request.ai_model,
                "average_score": average_score,
                "processing_time": round(processing_time, 2)
            }
            
        except Exception as e:
            logger.error(f"Error in job agent task: {e}")
            
            # 更新任务状态为失败
            if task:
                try:
                    processing_time = time.time() - start_time
                    TaskService.update_agent_task(
                        db, task.id, user_id,
                        AgentTaskUpdate(
                            status="failed",
                            completed_at=datetime.now(),
                            other_message=str(e),
                            execution_result={
                                "error": str(e),
                                "processing_time_seconds": round(processing_time, 2)
                            }
                        )
                    )
                except Exception as update_error:
                    logger.error(f"Failed to update task status: {update_error}")
            
            raise
    
    async def _get_user_resume(self, db: Session, user_id: UUID, resume_id: UUID) -> Resumes:
        """获取用户简历"""
        try:
            resume = db.exec(
                select(Resumes).where(
                    Resumes.id == resume_id,
                    Resumes.user_id == user_id
                )
            ).first()
            return resume
        except Exception as e:
            logger.error(f"Error getting resume {resume_id}: {e}")
            return None
    
    async def _analyze_jobs_with_resume(
        self,
        db: Session,
        resume: Resumes,
        jobs: List[AgentFoundJobs],
        task_id: UUID
    ) -> List[JobMatchingResult]:
        """使用简历分析工作匹配度"""
        results = []
        
        # 提取简历数据
        resume_data = extract_resume_summary({
            "first_name": resume.first_name,
            "last_name": resume.last_name,
            "email": resume.email,
            "location": resume.location,
            "professional_summary": resume.professional_summary,
            "work_experience": resume.work_experience or [],
            "education": resume.education or [],
            "skills": resume.skills or [],
            "projects": resume.projects or [],
            "certifications": resume.certifications or [],
            "target_role": resume.target_role
        })
        
        # 获取提示词模板
        prompt_template = get_matching_prompt()
        
        logger.info(f"Starting AI analysis for {len(jobs)} jobs")
        
        # 逐个分析工作（避免并发过多导致API限制）
        for i, job in enumerate(jobs):
            try:
                logger.debug(f"Analyzing job {i+1}/{len(jobs)}: {job.title}")
                
                # 提取工作数据
                job_data = extract_job_summary({
                    "title": job.title,
                    "company": job.company,
                    "location": job.location,
                    "work_type": job.work_type,
                    "salary": job.salary,
                    "detailed_description": job.detailed_description,
                    "job_url": job.job_url,
                    "source_platform": job.source_platform
                })
                
                # 调用AI分析
                score, analysis = self.llm_client.analyze_resume_job_match(
                    resume_data, job_data, prompt_template
                )
                
                # 验证分析结构
                if not isinstance(analysis, dict):
                    analysis = {"analysis": str(analysis), "error": "Invalid analysis format"}
                    score = 0
                
                # 确保必需字段存在
                required_fields = ["summary", "strengths", "gaps", "recommendations", "reasoning"]
                for field in required_fields:
                    if field not in analysis:
                        if field in ["strengths", "gaps", "recommendations"]:
                            analysis[field] = []
                        else:
                            analysis[field] = "Not provided"
                
                # 更新工作记录
                job.match_score = max(0, min(100, score))
                job.ai_analysis = analysis
                job.updated_at = datetime.now()
                
                db.add(job)
                db.commit()
                db.refresh(job)
                
                results.append(JobMatchingResult(
                    job_id=job.id,
                    matching_score=job.match_score,
                    ai_analysis=analysis,
                    analysis_success=True
                ))
                
                logger.info(f"Successfully analyzed job {job.id}: score={score}")
                
                # 添加延迟避免API限制
                if i < len(jobs) - 1:
                    await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"Error analyzing job {job.id}: {e}")
                
                # 记录失败的分析
                error_analysis = {
                    "error": str(e),
                    "summary": "Analysis failed",
                    "strengths": [],
                    "gaps": ["Analysis error occurred"],
                    "recommendations": ["Please check system logs"],
                    "reasoning": f"Error during analysis: {str(e)}"
                }
                
                job.match_score = 0
                job.ai_analysis = error_analysis
                job.updated_at = datetime.now()
                
                db.add(job)
                db.commit()
                db.refresh(job)
                
                results.append(JobMatchingResult(
                    job_id=job.id,
                    matching_score=0,
                    ai_analysis=error_analysis,
                    analysis_success=False
                ))
        
        return results
    
    def _calculate_average_score(self, results: List[JobMatchingResult]) -> float:
        """计算平均匹配分数"""
        successful_results = [r for r in results if r.analysis_success and r.matching_score > 0]
        if not successful_results:
            return 0.0
        
        total_score = sum(r.matching_score for r in successful_results)
        return round(total_score / len(successful_results), 2)

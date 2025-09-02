"""
Resume Job Matching Service.
Handles AI-powered analysis of resume-job compatibility.
"""
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from uuid import UUID
import concurrent.futures
import time

from sqlmodel import Session, select

from ..models import AgentTasks, AgentFoundJobs
from ..schemas import ResumeJobMatchingRequest, JobMatchingResult
from ..utils.llm_client import create_llm_client
from ..utils.prompts import get_matching_prompt, extract_resume_summary, extract_job_summary
from ...db.models import Resumes

logger = logging.getLogger(__name__)


class ResumeMatchingService:
    """Service for analyzing resume-job matches using AI"""
    
    def __init__(self, ai_model: str = "deepseek", max_workers: int = 3):
        self.ai_model = ai_model
        self.llm_client = create_llm_client(ai_model)
        self.max_workers = max_workers  # Control concurrent LLM calls
        self.executor = concurrent.futures.ThreadPoolExecutor(max_workers=max_workers)
    
    def __del__(self):
        """Cleanup executor on deletion"""
        if hasattr(self, 'executor'):
            self.executor.shutdown(wait=True)
    
    async def execute_resume_job_matching(
        self,
        db: Session,
        user_id: UUID,
        matching_request: ResumeJobMatchingRequest
    ) -> Dict[str, Any]:
        """
        Execute resume-job matching analysis.
        
        Args:
            db: Database session
            user_id: Current user ID
            matching_request: Matching request parameters
            
        Returns:
            Analysis results with task information
        """
        task = None
        try:
            # 1. Validate and get resume
            resume = await self._get_user_resume(db, user_id, matching_request.resume_id)
            if not resume:
                raise ValueError(f"Resume {matching_request.resume_id} not found or not accessible")
            
            # 2. Validate and get task with jobs
            jobs = await self._get_task_jobs(db, user_id, matching_request.task_id)
            if not jobs:
                raise ValueError(f"No jobs found for task {matching_request.task_id}")
            
            # 3. Create matching task
            from .task_service import TaskService
            from ..schemas import AgentTaskCreate
            
            task_create = AgentTaskCreate(
                task_type="resume_job_matching",
                task_description=matching_request.task_description or f"AI analysis of resume {resume.name} against {len(jobs)} jobs",
                task_instructions={
                    "resume_id": str(matching_request.resume_id),
                    "source_task_id": str(matching_request.task_id),
                    "ai_model": matching_request.ai_model or self.ai_model,
                    "jobs_count": len(jobs)
                }
            )
            
            task = TaskService.create_agent_task(db, user_id, task_create)
            
            # 4. Update task status to running
            from ..schemas import AgentTaskUpdate
            TaskService.update_agent_task(
                db, task.id, user_id,
                AgentTaskUpdate(status="running", started_at=datetime.now())
            )
            
            # 5. Process jobs with proper error handling
            start_time = time.time()
            results = await self._analyze_jobs_batch(db, resume, jobs, task.id)
            processing_time = time.time() - start_time
            
            # 6. Update task status to completed
            successful_analyses = sum(1 for r in results if r.analysis_success)
            failed_analyses = len(jobs) - successful_analyses
            
            TaskService.update_agent_task(
                db, task.id, user_id,
                AgentTaskUpdate(
                    status="completed",
                    completed_at=datetime.now(),
                    execution_result={
                        "jobs_analyzed": len(jobs),
                        "successful_analyses": successful_analyses,
                        "failed_analyses": failed_analyses,
                        "resume_id": str(matching_request.resume_id),
                        "ai_model": matching_request.ai_model or self.ai_model,
                        "average_score": self._calculate_average_score(results),
                        "processing_time_seconds": round(processing_time, 2)
                    }
                )
            )
            
            return {
                "task_id": task.id,
                "message": f"Analysis completed for {len(jobs)} jobs",
                "jobs_analyzed": len(jobs),
                "successful_analyses": successful_analyses,
                "failed_analyses": failed_analyses,
                "resume_id": matching_request.resume_id,
                "ai_model": matching_request.ai_model or self.ai_model,
                "processing_time": round(processing_time, 2)
            }
            
        except Exception as e:
            logger.error(f"Error in resume-job matching: {e}")
            # Update task status to failed if task was created
            if task:
                try:
                    from .task_service import TaskService
                    from ..schemas import AgentTaskUpdate
                    TaskService.update_agent_task(
                        db, task.id, user_id,
                        AgentTaskUpdate(
                            status="failed",
                            completed_at=datetime.now(),
                            other_message=str(e)
                        )
                    )
                except Exception as update_error:
                    logger.error(f"Failed to update task status: {update_error}")
            raise
    
    async def _get_user_resume(self, db: Session, user_id: UUID, resume_id: UUID) -> Optional[Resumes]:
        """Get resume that belongs to the user"""
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
    
    async def _get_task_jobs(self, db: Session, user_id: UUID, task_id: UUID) -> List[AgentFoundJobs]:
        """Get all jobs from a specific task"""
        try:
            jobs = db.exec(
                select(AgentFoundJobs).where(
                    AgentFoundJobs.agent_task_id == task_id,
                    AgentFoundJobs.user_id == user_id
                )
            ).all()
            return list(jobs)
        except Exception as e:
            logger.error(f"Error getting jobs for task {task_id}: {e}")
            return []
    
    async def _analyze_jobs_batch(
        self, 
        db: Session, 
        resume: Resumes, 
        jobs: List[AgentFoundJobs],
        task_id: UUID
    ) -> List[JobMatchingResult]:
        """Analyze multiple jobs against resume with proper concurrency control"""
        results = []
        
        # Extract resume data once
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
        
        # Get the prompt template
        prompt_template = get_matching_prompt()
        
        logger.info(f"Starting analysis of {len(jobs)} jobs with {self.max_workers} workers")
        
        # Process jobs with controlled concurrency
        loop = asyncio.get_event_loop()
        
        # Create tasks for each job analysis
        tasks = []
        for job in jobs:
            task = loop.run_in_executor(
                self.executor,
                self._analyze_single_job_sync,
                resume_data,
                job,
                prompt_template
            )
            tasks.append((job, task))
        
        # Process results as they complete
        completed_analyses = []
        failed_jobs = []
        
        for job, task in tasks:
            try:
                result = await task
                completed_analyses.append(result)
                results.append(result)
            except Exception as e:
                logger.error(f"Error analyzing job {job.id}: {e}")
                failed_jobs.append(job.id)
                results.append(JobMatchingResult(
                    job_id=job.id,
                    matching_score=0,
                    ai_analysis={
                        "error": str(e),
                        "summary": "Analysis failed due to system error",
                        "strengths": [],
                        "gaps": ["Analysis could not be completed"],
                        "recommendations": ["Please try again later"],
                        "reasoning": f"System error: {str(e)}"
                    },
                    analysis_success=False
                ))
        
        # Batch update database for successful analyses
        if completed_analyses:
            try:
                await self._batch_update_job_analyses(db, completed_analyses)
            except Exception as e:
                logger.error(f"Error batch updating job analyses: {e}")
                # Continue anyway, results are already in memory
        
        logger.info(f"Analysis completed: {len(completed_analyses)} successful, {len(failed_jobs)} failed")
        return results
    
    def _analyze_single_job_sync(
        self,
        resume_data: Dict[str, Any], 
        job: AgentFoundJobs,
        prompt_template: str
    ) -> JobMatchingResult:
        """Synchronous analysis of a single job (runs in thread)"""
        try:
            # Extract job data
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
            
            # Get AI analysis (synchronous call)
            score, analysis = self.llm_client.analyze_resume_job_match(
                resume_data, job_data, prompt_template
            )
            
            # Validate analysis structure
            if not isinstance(analysis, dict):
                analysis = {"analysis": str(analysis), "error": "Invalid analysis format"}
                score = 0
            
            # Ensure required fields exist
            required_fields = ["summary", "strengths", "gaps", "recommendations", "reasoning"]
            for field in required_fields:
                if field not in analysis:
                    if field in ["strengths", "gaps", "recommendations"]:
                        analysis[field] = []
                    else:
                        analysis[field] = "Not provided"
            
            logger.info(f"Successfully analyzed job {job.id}: score={score}")
            
            return JobMatchingResult(
                job_id=job.id,
                matching_score=max(0, min(100, score)),  # Ensure score is in valid range
                ai_analysis=analysis,
                analysis_success=True
            )
            
        except Exception as e:
            logger.error(f"Error analyzing job {job.id}: {e}")
            return JobMatchingResult(
                job_id=job.id,
                matching_score=0,
                ai_analysis={
                    "error": str(e),
                    "summary": "Analysis failed",
                    "strengths": [],
                    "gaps": ["Analysis error occurred"],
                    "recommendations": ["Please check system logs"],
                    "reasoning": f"Error during analysis: {str(e)}"
                },
                analysis_success=False
            )
    
    async def _batch_update_job_analyses(
        self,
        db: Session,
        successful_results: List[JobMatchingResult]
    ):
        """Batch update job records with analysis results"""
        try:
            # Group updates to minimize database calls
            updates = []
            current_time = datetime.now()
            
            for result in successful_results:
                if result.analysis_success:
                    updates.append({
                        'job_id': result.job_id,
                        'match_score': result.matching_score,
                        'ai_analysis': result.ai_analysis,
                        'updated_at': current_time
                    })
            
            # Batch update in chunks to avoid memory issues with large datasets
            chunk_size = 50
            for i in range(0, len(updates), chunk_size):
                chunk = updates[i:i + chunk_size]
                
                for update in chunk:
                    job = db.get(AgentFoundJobs, update['job_id'])
                    if job:
                        job.match_score = update['match_score']
                        job.ai_analysis = update['ai_analysis']
                        job.updated_at = update['updated_at']
                        db.add(job)
                
                # Commit chunk
                db.commit()
                
        except Exception as e:
            logger.error(f"Error in batch update: {e}")
            db.rollback()
            raise
    
    def _calculate_average_score(self, results: List[JobMatchingResult]) -> float:
        """Calculate average matching score from results"""
        successful_results = [r for r in results if r.analysis_success and r.matching_score > 0]
        if not successful_results:
            return 0.0
        
        total_score = sum(r.matching_score for r in successful_results)
        return round(total_score / len(successful_results), 2)
    
    async def get_resume_job_analysis(
        self, 
        db: Session, 
        user_id: UUID, 
        job_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get existing analysis for a specific job"""
        try:
            job = db.exec(
                select(AgentFoundJobs).where(
                    AgentFoundJobs.id == job_id,
                    AgentFoundJobs.user_id == user_id,
                    AgentFoundJobs.match_score.is_not(None)
                )
            ).first()
            
            if job:
                return {
                    "job_id": job.id,
                    "matching_score": job.match_score,
                    "ai_analysis": job.ai_analysis,
                    "job_title": job.title,
                    "company": job.company,
                    "location": job.location,
                    "updated_at": job.updated_at
                }
            return None
            
        except Exception as e:
            logger.error(f"Error getting job analysis {job_id}: {e}")
            return None
    
    async def get_task_analysis_summary(
        self,
        db: Session,
        user_id: UUID,
        task_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get summary of all analyses for a task"""
        try:
            jobs = await self._get_task_jobs(db, user_id, task_id)
            if not jobs:
                return None
            
            analyzed_jobs = [job for job in jobs if job.match_score is not None]
            
            if not analyzed_jobs:
                return {
                    "task_id": task_id,
                    "total_jobs": len(jobs),
                    "analyzed_jobs": 0,
                    "status": "pending"
                }
            
            scores = [job.match_score for job in analyzed_jobs]
            
            return {
                "task_id": task_id,
                "total_jobs": len(jobs),
                "analyzed_jobs": len(analyzed_jobs),
                "status": "completed" if len(analyzed_jobs) == len(jobs) else "partial",
                "average_score": round(sum(scores) / len(scores), 2),
                "max_score": max(scores),
                "min_score": min(scores),
                "score_distribution": {
                    "excellent": len([s for s in scores if s >= 90]),
                    "good": len([s for s in scores if 70 <= s < 90]),
                    "fair": len([s for s in scores if 50 <= s < 70]),
                    "poor": len([s for s in scores if s < 50])
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting task analysis summary {task_id}: {e}")
            return None
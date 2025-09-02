"""
Task service layer for handling agent task execution.
This module contains the core business logic for task management and scraper operations.
"""
import logging
import asyncio
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlmodel import Session, select
from fastapi import HTTPException

from ..models import AgentTasks, AgentFoundJobs
from ..schemas import AgentTaskCreate, AgentTaskUpdate, SeekScraperRequest
from .seek_scraper_service import SeekScraperService
from .resume_matching_service import ResumeMatchingService

logger = logging.getLogger(__name__)


class TaskService:
    """Task service for handling agent task business logic."""
    
    @staticmethod
    def create_agent_task(
        db: Session,
        user_id: UUID,
        task_data: AgentTaskCreate
    ) -> AgentTasks:
        """Create a new agent task."""
        try:
            task = AgentTasks(
                user_id=user_id,
                task_type=task_data.task_type,
                task_description=task_data.task_description,
                task_instructions=task_data.task_instructions or {},
                is_recurring=task_data.is_recurring,
                recurrence_config=task_data.recurrence_config,
                max_executions=task_data.max_executions
            )
            
            db.add(task)
            db.commit()
            db.refresh(task)
            
            logger.info(f"Created agent task {task.id} for user {user_id}")
            return task
            
        except Exception as e:
            logger.error(f"Error creating agent task: {e}")
            db.rollback()
            raise HTTPException(status_code=500, detail="Failed to create agent task")
    
    @staticmethod
    def update_agent_task(
        db: Session,
        task_id: UUID,
        user_id: UUID,
        task_update: AgentTaskUpdate
    ) -> AgentTasks:
        """Update an existing agent task."""
        try:
            # Get the task
            task = db.exec(
                select(AgentTasks).where(
                    AgentTasks.id == task_id,
                    AgentTasks.user_id == user_id
                )
            ).first()
            
            if not task:
                raise HTTPException(status_code=404, detail="Task not found")
            
            # Update fields
            update_data = task_update.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(task, key, value)
            
            task.updated_at = datetime.now()
            
            db.add(task)
            db.commit()
            db.refresh(task)
            
            logger.info(f"Updated agent task {task_id}")
            return task
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating agent task {task_id}: {e}")
            db.rollback()
            raise HTTPException(status_code=500, detail="Failed to update agent task")
    
    @staticmethod
    def get_user_tasks(
        db: Session,
        user_id: UUID,
        status: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> tuple[List[AgentTasks], int]:
        """Get tasks for a specific user with optional filtering and pagination."""
        try:
            query = select(AgentTasks).where(AgentTasks.user_id == user_id)
            
            if status:
                query = query.where(AgentTasks.status == status)
            
            # Get total count
            total_count = len(db.exec(query).all())
            
            # Apply pagination
            offset = (page - 1) * per_page
            tasks = db.exec(query.order_by(AgentTasks.created_at.desc()).offset(offset).limit(per_page)).all()
            
            return tasks, total_count
            
        except Exception as e:
            logger.error(f"Error getting user tasks for user {user_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to get user tasks")
    
    @staticmethod
    async def execute_seek_scraper(
        db: Session,
        user_id: UUID,
        scraper_request: SeekScraperRequest
    ) -> Dict[str, Any]:
        """Execute seek scraper task asynchronously."""
        try:
            # Create agent task
            task_create = AgentTaskCreate(
                task_type="seek_scraper",
                task_description=scraper_request.task_description or f"Scraping {scraper_request.job_required} jobs: {', '.join(scraper_request.job_titles)}",
                task_instructions={
                    "job_titles": scraper_request.job_titles,
                    "location": scraper_request.location,
                    "job_required": scraper_request.job_required
                }
            )
            
            task = TaskService.create_agent_task(db, user_id, task_create)
            
            # Update task status to running
            TaskService.update_agent_task(
                db, task.id, user_id,
                AgentTaskUpdate(status="running", started_at=datetime.now())
            )
            
            # Execute scraper in background
            scraper_service = SeekScraperService()
            jobs_found = await scraper_service.scrape_jobs_async(
                job_titles=scraper_request.job_titles,
                location=scraper_request.location,
                job_required=scraper_request.job_required,
                task_id=task.id,
                user_id=user_id,
                db=db
            )
            
            # Update task status to completed
            TaskService.update_agent_task(
                db, task.id, user_id,
                AgentTaskUpdate(
                    status="completed",
                    completed_at=datetime.now(),
                    execution_result={
                        "jobs_found": len(jobs_found),
                        "jobs_required": scraper_request.job_required,
                        "job_titles_searched": scraper_request.job_titles,
                        "location": scraper_request.location,
                        "completion_rate": f"{len(jobs_found)}/{scraper_request.job_required}"
                    }
                )
            )
            
            return {
                "task_id": task.id,
                "message": "Scraping completed successfully",
                "jobs_found": len(jobs_found),
                "status": "completed"
            }
            
        except Exception as e:
            # Update task status to failed if task was created
            if 'task' in locals():
                try:
                    TaskService.update_agent_task(
                        db, task.id, user_id,
                        AgentTaskUpdate(
                            status="failed",
                            completed_at=datetime.now(),
                            other_message=str(e)
                        )
                    )
                except:
                    pass
            
            logger.error(f"Error executing seek scraper for user {user_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Scraper execution failed: {str(e)}")
    
    @staticmethod
    async def execute_resume_job_matching(
        db: Session,
        user_id: UUID,
        matching_request: 'ResumeJobMatchingRequest'
    ) -> Dict[str, Any]:
        """Execute resume-job matching analysis using AI."""
        try:
            # Create resume matching service with specified AI model
            matching_service = ResumeMatchingService(ai_model=matching_request.ai_model)
            
            # Execute the matching analysis
            result = await matching_service.execute_resume_job_matching(
                db=db,
                user_id=user_id,
                matching_request=matching_request
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error in resume-job matching execution: {e}")
            raise
    
    @staticmethod
    def get_agent_found_jobs(
        db: Session,
        user_id: UUID,
        task_id: Optional[UUID] = None,
        saved_only: Optional[bool] = None,
        page: int = 1,
        per_page: int = 20
    ) -> tuple[List[AgentFoundJobs], int]:
        """Get agent found jobs for a user with optional filtering."""
        try:
            query = select(AgentFoundJobs).where(AgentFoundJobs.user_id == user_id)
            
            if task_id:
                query = query.where(AgentFoundJobs.agent_task_id == task_id)
            
            if saved_only is not None:
                query = query.where(AgentFoundJobs.saved == saved_only)
            
            # Get total count
            total_count = len(db.exec(query).all())
            
            # Apply pagination
            offset = (page - 1) * per_page
            jobs = db.exec(query.order_by(AgentFoundJobs.created_at.desc()).offset(offset).limit(per_page)).all()
            
            return jobs, total_count
            
        except Exception as e:
            logger.error(f"Error getting agent found jobs for user {user_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to get agent found jobs")
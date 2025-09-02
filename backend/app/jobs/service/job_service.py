"""
Jobs business logic service layer.
This module contains the core business logic for job management operations.
"""
import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlmodel import Session, select

from ..models import Jobs
from ..schemas import JobCreate, JobUpdate, JobResponse

logger = logging.getLogger(__name__)


class JobService:
    """Job service for handling job business logic."""
    
    @staticmethod
    def get_user_jobs(
        db: Session, 
        user_id: UUID, 
        status: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> tuple[List[Jobs], int]:
        """
        Get jobs for a specific user with optional filtering and pagination.
        
        Args:
            db: Database session
            user_id: User ID
            status: Optional status filter
            page: Page number (1-based)
            per_page: Items per page
            
        Returns:
            Tuple of (jobs_list, total_count)
        """
        query = select(Jobs).where(Jobs.user_id == user_id)
        
        # 添加status过滤
        if status:
            query = query.where(Jobs.application_status == status)
        
        # Get total count
        total_query = select(Jobs.id).where(Jobs.user_id == user_id)
        if status:
            total_query = total_query.where(Jobs.application_status == status)
        total = len(db.exec(total_query).all())
        
        # Apply pagination and order by created_at desc
        query = query.order_by(Jobs.created_at.desc())
        query = query.offset((page - 1) * per_page).limit(per_page)
        
        jobs = db.exec(query).all()
        
        return jobs, total
    
    @staticmethod
    def get_job_by_id(db: Session, job_id: UUID, user_id: UUID) -> Jobs:
        """
        Get a specific job by ID and user ID.
        
        Args:
            db: Database session
            job_id: Job ID
            user_id: User ID
            
        Returns:
            Job object
            
        Raises:
            HTTPException: If job not found
        """
        job = db.exec(
            select(Jobs).where(Jobs.id == job_id, Jobs.user_id == user_id)
        ).first()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return job
    
    @staticmethod
    def create_job(db: Session, job_data: JobCreate, user_id: UUID) -> Jobs:
        """
        Create a new job.
        
        Args:
            db: Database session
            job_data: Job creation data
            user_id: User ID
            
        Returns:
            Created job object
        """
        db_job = Jobs(
            **job_data.model_dump(),
            user_id=user_id
        )
        
        db.add(db_job)
        db.commit()
        db.refresh(db_job)
        
        logger.info(f"Created new job: {db_job.title} for user {user_id}")
        
        return db_job
    
    @staticmethod
    def update_job(
        db: Session, 
        job_id: UUID, 
        job_data: JobUpdate, 
        user_id: UUID
    ) -> Jobs:
        """
        Update an existing job.
        
        Args:
            db: Database session
            job_id: Job ID
            job_data: Job update data
            user_id: User ID
            
        Returns:
            Updated job object
            
        Raises:
            HTTPException: If job not found
        """
        job = JobService.get_job_by_id(db, job_id, user_id)
        
        update_data = job_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(job, key, value)
        
        job.updated_at = datetime.now()
        
        db.add(job)
        db.commit()
        db.refresh(job)
        
        logger.info(f"Updated job: {job.title} for user {user_id}")
        
        return job
    
    @staticmethod
    def delete_job(db: Session, job_id: UUID, user_id: UUID) -> bool:
        """
        Delete a job.
        
        Args:
            db: Database session
            job_id: Job ID
            user_id: User ID
            
        Returns:
            True if deleted successfully
            
        Raises:
            HTTPException: If job not found
        """
        job = JobService.get_job_by_id(db, job_id, user_id)
        
        db.delete(job)
        db.commit()
        
        logger.info(f"Deleted job: {job.title} for user {user_id}")
        
        return True
    
    @staticmethod
    def get_job_stats(db: Session, user_id: UUID) -> dict:
        """
        Get job statistics for a user.
        
        Args:
            db: Database session
            user_id: User ID
            
        Returns:
            Dictionary with job statistics
        """
        total_jobs = len(db.exec(
            select(Jobs.id).where(Jobs.user_id == user_id)
        ).all())
        
        # 按状态统计工作数量
        applied_jobs = len(db.exec(
            select(Jobs.id).where(
                Jobs.user_id == user_id,
                Jobs.application_status.in_(["applied", "agent_applied"])
            )
        ).all())
        
        saved_jobs = len(db.exec(
            select(Jobs.id).where(
                Jobs.user_id == user_id,
                Jobs.application_status.in_(["saved", "draft"])
            )
        ).all())
        
        # 计算其他状态的工作数量（interview, rejected, accepted等）
        other_jobs = total_jobs - applied_jobs - saved_jobs
        
        return {
            "total_jobs": total_jobs,
            "applied_jobs": applied_jobs,
            "saved_jobs": saved_jobs,
            "other_jobs": other_jobs
        }

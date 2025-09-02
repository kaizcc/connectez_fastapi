from datetime import datetime
from typing import Dict, Optional, Any
from uuid import UUID

from pydantic import BaseModel, HttpUrl


class JobBase(BaseModel):
    title: str
    company: Optional[str] = None
    description: Optional[str] = None
    job_url: Optional[str] = None
    application_status: str = "saved"
    notes: Optional[str] = None
    source: Optional[str] = None


class JobCreate(JobBase):
    """Schema for creating a new job"""
    pass


class JobUpdate(BaseModel):
    """Schema for updating a job"""
    title: Optional[str] = None
    company: Optional[str] = None
    description: Optional[str] = None
    job_url: Optional[str] = None
    application_status: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    applied_at: Optional[datetime] = None
    score: Optional[int] = None


class JobResponse(JobBase):
    """Schema for job response"""
    id: UUID
    user_id: UUID
    resume_id: Optional[UUID] = None
    cover_letter: Optional[Dict[str, Any]] = None
    applied_at: Optional[datetime] = None
    score: Optional[int] = None
    agent_task_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class JobListResponse(BaseModel):
    """Schema for job list response with pagination"""
    jobs: list[JobResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class UrlScrapeRequest(BaseModel):
    """Schema for URL scraping request"""
    url: str


class ScrapedJobResponse(BaseModel):
    """Schema for scraped job response"""
    title: str
    company: Optional[str] = None
    description: Optional[str] = None
    job_url: str
    success: bool = True
    error_message: Optional[str] = None

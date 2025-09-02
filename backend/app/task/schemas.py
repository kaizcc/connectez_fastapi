from datetime import datetime
from typing import Dict, Optional, Any, List
from uuid import UUID
from pydantic import BaseModel, Field


# Agent Tasks Schemas
class AgentTaskBase(BaseModel):
    task_type: str
    task_description: str
    task_instructions: Optional[Dict[str, Any]] = None
    is_recurring: bool = False
    recurrence_config: Optional[Dict[str, Any]] = None
    max_executions: Optional[int] = None


class AgentTaskCreate(AgentTaskBase):
    pass


class AgentTaskUpdate(BaseModel):
    status: Optional[str] = None
    execution_result: Optional[Dict[str, Any]] = None
    other_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    is_active: Optional[bool] = None


class AgentTaskResponse(AgentTaskBase):
    id: UUID
    user_id: UUID
    status: str
    execution_result: Optional[Dict[str, Any]] = None
    other_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    execution_count: int
    last_execution_at: Optional[datetime] = None
    next_execution_at: Optional[datetime] = None
    is_active: bool

    class Config:
        from_attributes = True


# Agent Found Jobs Schemas
class AgentFoundJobBase(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    salary: Optional[str] = None
    job_url: Optional[str] = None
    work_type: Optional[str] = None
    detailed_description: Optional[str] = None
    source_platform: Optional[str] = None
    match_score: Optional[int] = Field(None, ge=0, le=100)
    ai_analysis: Optional[Dict[str, Any]] = None


class AgentFoundJobCreate(AgentFoundJobBase):
    agent_task_id: Optional[UUID] = None


class AgentFoundJobUpdate(BaseModel):
    application_status: Optional[str] = None
    saved: Optional[bool] = None
    match_score: Optional[int] = Field(None, ge=0, le=100)
    ai_analysis: Optional[Dict[str, Any]] = None


class AgentFoundJobResponse(AgentFoundJobBase):
    id: UUID
    agent_task_id: Optional[UUID] = None
    user_id: UUID
    application_status: str
    saved: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Seek Scraper 特定的 Schemas
class SeekScraperRequest(BaseModel):
    """Seek爬虫请求参数"""
    job_titles: List[str] = Field(..., description="要搜索的职位标题列表")
    location: str = Field(default="Sydney NSW", description="搜索地点")
    job_required: int = Field(default=5, ge=1, le=50, description="需要的有效工作数量")
    task_description: Optional[str] = Field(default=None, description="任务描述")


class SeekScraperResponse(BaseModel):
    """Seek爬虫响应"""
    task_id: UUID
    message: str
    jobs_found: int


# Resume Job Matching 特定的 Schemas
class ResumeJobMatchingRequest(BaseModel):
    """简历工作匹配请求参数"""
    resume_id: UUID = Field(..., description="要分析的简历ID")
    task_id: UUID = Field(..., description="包含工作信息的任务ID")
    ai_model: str = Field(default="deepseek", description="使用的AI模型")
    task_description: Optional[str] = Field(default=None, description="任务描述")


class ResumeJobMatchingResponse(BaseModel):
    """简历工作匹配响应"""
    task_id: UUID
    message: str
    jobs_analyzed: int
    resume_id: UUID
    ai_model: str


class JobMatchingResult(BaseModel):
    """单个工作匹配结果"""
    job_id: UUID
    matching_score: int
    ai_analysis: Dict[str, Any]
    analysis_success: bool


# Job Agent 综合任务 Schemas
class JobAgentRequest(BaseModel):
    """Job Agent综合任务请求参数 - 结合爬虫和AI匹配"""
    job_titles: List[str] = Field(..., description="要搜索的职位标题列表")
    location: str = Field(default="Sydney NSW", description="搜索地点")
    job_required: int = Field(default=5, ge=1, le=50, description="需要的有效工作数量")
    task_description: Optional[str] = Field(default=None, description="任务描述")
    resume_id: UUID = Field(..., description="要分析的简历ID")
    ai_model: str = Field(default="deepseek", description="使用的AI模型")


class JobAgentResponse(BaseModel):
    """Job Agent综合任务响应"""
    task_id: UUID
    message: str
    jobs_found: int
    jobs_analyzed: int
    successful_analyses: int
    failed_analyses: int
    resume_id: UUID
    ai_model: str
    average_score: float
    processing_time: float
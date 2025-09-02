from datetime import datetime
from typing import Dict, Optional, Any, List
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, JSON, Column
from sqlalchemy import Text, Boolean


class AgentTasks(SQLModel, table=True):
    """Agent任务表模型 - 对应schema.sql中的agent_tasks表"""
    __tablename__ = "agent_tasks"
    
    # 基础字段
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="auth.users.id")
    
    # 任务基本信息
    task_type: str
    task_description: str
    status: str = Field(default="pending")
    
    # 统一参数存储 - 用于存储scraper参数等
    task_instructions: Optional[Dict[str, Any]] = Field(default_factory=dict, sa_column=Column(JSON))
    
    # 统一结果存储 - 用于存储执行结果
    execution_result: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    
    # 消息字段
    other_message: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    # 时间记录
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # 循环执行相关字段
    is_recurring: bool = Field(default=False, sa_column=Column(Boolean))
    recurrence_config: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    next_execution_at: Optional[datetime] = None
    last_execution_at: Optional[datetime] = None
    execution_count: int = Field(default=0)
    max_executions: Optional[int] = None
    is_active: bool = Field(default=True, sa_column=Column(Boolean))


class AgentFoundJobs(SQLModel, table=True):
    """Agent找到的工作表模型 - 对应schema.sql中的agent_found_jobs表"""
    __tablename__ = "agent_found_jobs"
    
    # 基础字段
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    agent_task_id: Optional[UUID] = Field(default=None, foreign_key="agent_tasks.id")
    user_id: UUID = Field(foreign_key="auth.users.id")
    
    # 工作基本信息
    title: str
    company: str
    location: Optional[str] = None
    salary: Optional[str] = None
    job_url: Optional[str] = None
    work_type: Optional[str] = None  # Full time, Part time, Contract等
    detailed_description: Optional[str] = Field(default=None, sa_column=Column(Text))
    application_status: str = Field(default="agent_found")
    source_platform: Optional[str] = None  # 来源平台，例如"seek"
    
    # AI分析结果
    match_score: Optional[int] = None  # 0-100分
    ai_analysis: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    
    # 用户操作
    saved: bool = Field(default=False, sa_column=Column(Boolean))
    
    # 时间戳
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

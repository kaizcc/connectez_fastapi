from datetime import datetime
from typing import Dict, Optional, Any
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, JSON, Column
from sqlalchemy import Text


# Jobs table - 根据schema.sql中的实际字段定义
class Jobs(SQLModel, table=True):
    __tablename__ = "jobs"
    
    # 基础字段
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="auth.users.id")
    title: str
    company: Optional[str] = None
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    job_url: Optional[str] = None
    # resume_id: Optional[UUID] = Field(default=None, foreign_key="resumes.id")  # 暂时注释以避免外键问题
    cover_letter: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    application_status: str = Field(default="saved")
    applied_at: Optional[datetime] = None
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    source: Optional[str] = None
    score: Optional[int] = None
    agent_task_id: Optional[UUID] = Field(default=None, foreign_key="agent_tasks.id")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

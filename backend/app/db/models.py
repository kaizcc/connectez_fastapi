from datetime import datetime
from typing import Dict, List, Optional, Any
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel, JSON, Column
from sqlalchemy import Text

# Note: User model has been moved to auth/models.py for better organization
# Note: Jobs model has been moved to jobs/models.py for better organization


# Subscriptions table
class Subscriptions(SQLModel, table=True):
    __tablename__ = "subscriptions"
    
    user_id: UUID = Field(primary_key=True, foreign_key="auth.users.id")
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    subscription_plan: str = Field(default="free")
    subscription_status: Optional[str] = None
    current_period_end: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)



# Resumes table
class Resumes(SQLModel, table=True):
    __tablename__ = "resumes"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="auth.users.id")
    parent_id: Optional[UUID] = Field(default=None, foreign_key="resumes.id")
    is_base_resume: Optional[bool] = Field(default=False)
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    professional_summary: Optional[str] = Field(default=None, sa_column=Column(Text))
    work_experience: Optional[List[Dict[str, Any]]] = Field(default_factory=list, sa_column=Column(JSON))
    education: Optional[List[Dict[str, Any]]] = Field(default_factory=list, sa_column=Column(JSON))
    skills: Optional[List[Dict[str, Any]]] = Field(default_factory=list, sa_column=Column(JSON))
    projects: Optional[List[Dict[str, Any]]] = Field(default_factory=list, sa_column=Column(JSON))
    certifications: Optional[List[Dict[str, Any]]] = Field(default_factory=list, sa_column=Column(JSON))
    section_order: Optional[List[str]] = Field(
        default=["professional_summary", "work_experience", "skills", "projects", "education", "certifications"],
        sa_column=Column(JSON)
    )
    section_configs: Optional[Dict[str, Any]] = Field(
        default={
            "skills": {"style": "grouped", "visible": True}, 
            "projects": {"visible": True, "max_items": 3}, 
            "education": {"visible": True, "max_items": None}, 
            "certifications": {"visible": True}, 
            "work_experience": {"visible": True, "max_items": None}
        }, 
        sa_column=Column(JSON)
    )
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    resume_title: Optional[str] = None
    target_role: Optional[str] = None
    document_settings: Optional[Dict[str, Any]] = Field(
        default={
            "header_name_size": 24, "skills_margin_top": 2, "document_font_size": 10, 
            "projects_margin_top": 2, "skills_item_spacing": 2, "document_line_height": 1.5, 
            "education_margin_top": 2, "skills_margin_bottom": 2, "experience_margin_top": 2, 
            "projects_item_spacing": 4, "education_item_spacing": 4, "projects_margin_bottom": 2, 
            "education_margin_bottom": 2, "experience_item_spacing": 4, "document_margin_vertical": 36, 
            "experience_margin_bottom": 2, "skills_margin_horizontal": 0, "document_margin_horizontal": 36, 
            "header_name_bottom_spacing": 24, "projects_margin_horizontal": 0, "education_margin_horizontal": 0, 
            "experience_margin_horizontal": 0
        }, 
        sa_column=Column(JSON)
    )
    others: Optional[List[Dict[str, Any]]] = Field(default_factory=list, sa_column=Column(JSON))


# Profiles table
class Profiles(SQLModel, table=True):
    __tablename__ = "profiles"
    
    user_id: UUID = Field(primary_key=True, foreign_key="auth.users.id")
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    phone_number: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    work_experience: Optional[List[Dict[str, Any]]] = Field(default_factory=list, sa_column=Column(JSON))
    education: Optional[List[Dict[str, Any]]] = Field(default_factory=list, sa_column=Column(JSON))
    skills: Optional[List[Dict[str, Any]]] = Field(default_factory=list, sa_column=Column(JSON))
    projects: Optional[List[Dict[str, Any]]] = Field(default_factory=list, sa_column=Column(JSON))
    certifications: Optional[List[Dict[str, Any]]] = Field(default_factory=list, sa_column=Column(JSON))
    qa: Optional[Dict[str, Any]] = Field(
        default={"commonQuestions": {}, "customQuestions": {}, "preferences": {}}, 
        sa_column=Column(JSON)
    )


# User Credits table
class UserCredits(SQLModel, table=True):
    __tablename__ = "user_credits"
    
    user_id: UUID = Field(primary_key=True, foreign_key="auth.users.id")
    credits: int = Field(default=0)
    total_earned: int = Field(default=0)
    total_spent: int = Field(default=0)
    last_monthly_refill: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


# User Credit Usage table
class UserCreditUsage(SQLModel, table=True):
    __tablename__ = "user_credit_usage"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="auth.users.id")
    feature_used: str
    credits_spent: int = Field(default=1)
    reference_id: Optional[UUID] = None
    created_at: datetime = Field(default_factory=datetime.now)


# User Activities table
class UserActivities(SQLModel, table=True):
    __tablename__ = "user_activities"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="auth.users.id")
    activity_type: str  # 'task' | 'credit_code' | 'system'
    activity_key: str
    credits_earned: int = Field(default=0)
    details: Optional[Dict[str, Any]] = Field(default_factory=dict, sa_column=Column(JSON))
    completed_at: datetime = Field(default_factory=datetime.now)


# Credit Codes table
class CreditCodes(SQLModel, table=True):
    __tablename__ = "credit_codes"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    code: str = Field(unique=True)
    credit_amount: int
    max_uses: Optional[int] = None
    current_uses: int = Field(default=0)
    expires_at: Optional[datetime] = None
    description: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.now)


# API Keys table
class ApiKeys(SQLModel, table=True):
    __tablename__ = "api_keys"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    provider: str  # 'openai', 'anthropic', 'google', 'deepseek', 'groq'
    api_key: str
    base_url: Optional[str] = None
    model_name: Optional[str] = None
    is_pro: bool = Field(default=False)
    is_active: bool = Field(default=True)
    daily_limit: Optional[int] = None
    daily_usage: int = Field(default=0)
    priority: int = Field(default=0)
    last_used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


# Resume Scores table
class ResumeScores(SQLModel, table=True):
    __tablename__ = "resume_scores"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="auth.users.id")
    resume_id: UUID = Field(foreign_key="resumes.id")
    job_id: Optional[UUID] = Field(default=None, foreign_key="jobs.id")
    score_data: Dict[str, Any] = Field(sa_column=Column(JSON))  # 完整的ResumeScoreMetrics对象
    overall_score: int  # 冗余存储总分，便于查询和排序
    score_version: str = Field(default="v1")  # 评分算法版本
    ai_model: Optional[str] = None
    processing_time_ms: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


# Form Records table
class FormRecords(SQLModel, table=True):
    __tablename__ = "form_records"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="auth.users.id")
    website_url: str = Field(max_length=500)
    resume_id: Optional[UUID] = Field(default=None, foreign_key="resumes.id")
    form_fields: Dict[str, Any] = Field(sa_column=Column(JSON))
    ai_response: Dict[str, Any] = Field(sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

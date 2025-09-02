import logging
import math
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from .dependencies import DBSessionDependency, UserDependency
from .schemas import JobCreate, JobUpdate, JobResponse, JobListResponse, UrlScrapeRequest, ScrapedJobResponse
from .service import JobService, ScraperService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=JobListResponse, tags=["jobs"])
def get_jobs(
    current_user: UserDependency,
    db: DBSessionDependency,
    status: Optional[str] = Query(None, description="Filter by application status"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page")
):
    """获取用户的工作列表"""
    jobs, total = JobService.get_user_jobs(
        db, current_user.id, status, page, per_page
    )
    
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    
    return JobListResponse(
        jobs=[JobResponse.model_validate(job) for job in jobs],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@router.get("/stats", tags=["jobs"])
def get_job_stats(
    current_user: UserDependency,
    db: DBSessionDependency
):
    """获取用户的工作统计信息"""
    return JobService.get_job_stats(db, current_user.id)


@router.get("/{job_id}", response_model=JobResponse, tags=["jobs"])
def get_job(
    job_id: UUID,
    current_user: UserDependency,
    db: DBSessionDependency
):
    """获取单个工作详情"""
    job = JobService.get_job_by_id(db, job_id, current_user.id)
    return JobResponse.model_validate(job)


@router.post("/", response_model=JobResponse, tags=["jobs"])
def create_job(
    job_data: JobCreate,
    current_user: UserDependency,
    db: DBSessionDependency
):
    """创建新工作"""
    job = JobService.create_job(db, job_data, current_user.id)
    return JobResponse.model_validate(job)


@router.put("/{job_id}", response_model=JobResponse, tags=["jobs"])
def update_job(
    job_id: UUID,
    job_data: JobUpdate,
    current_user: UserDependency,
    db: DBSessionDependency
):
    """更新工作信息"""
    job = JobService.update_job(db, job_id, job_data, current_user.id)
    return JobResponse.model_validate(job)


@router.delete("/{job_id}", tags=["jobs"])
def delete_job(
    job_id: UUID,
    current_user: UserDependency,
    db: DBSessionDependency
):
    """删除工作"""
    JobService.delete_job(db, job_id, current_user.id)
    return {"message": "Job deleted successfully"}


@router.post("/scrape-url", response_model=ScrapedJobResponse, tags=["jobs"])
def scrape_job_from_url(
    request: UrlScrapeRequest,
    current_user: UserDependency,
    db: DBSessionDependency
):
    """从URL爬取工作信息"""
    try:
        scraper_service = ScraperService()
        scraped_data = scraper_service.extract_job_info_from_url(request.url)
        
        return ScrapedJobResponse(
            title=scraped_data.title,
            company=scraped_data.company,
            description=scraped_data.description,
            job_url=scraped_data.job_url,
            success=scraped_data.success,
            error_message=scraped_data.error_message
        )
        
    except Exception as e:
        logger.error(f"Error scraping URL {request.url}: {e}")
        return ScrapedJobResponse(
            title="",
            job_url=request.url,
            success=False,
            error_message=f"Internal error occurred while scraping the URL: {str(e)}"
        )

"""
Seek scraper service adapted for FastAPI framework.
This module contains the scraping logic adapted from the original seek_scraper.py.
"""
import asyncio
import logging
import time
import random
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from uuid import UUID

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from sqlmodel import Session

from ..models import AgentFoundJobs

logger = logging.getLogger(__name__)


class SeekScraperService:
    """Seek scraper service for job hunting automation."""
    
    def __init__(self, sleep_time: int = 3):
        self.sleep_time = sleep_time
    
    def setup_driver(self) -> Optional[webdriver.Chrome]:
        """配置Chrome浏览器选项"""
        try:
            chrome_options = Options()
            
            # 基本设置
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            chrome_options.add_argument('--headless')  # 无头模式
            
            # 设置真实的用户代理
            chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
            
            # 禁用图片加载以提高速度
            prefs = {"profile.managed_default_content_settings.images": 2}
            chrome_options.add_experimental_option("prefs", prefs)
            
            driver = webdriver.Chrome(options=chrome_options)
            # 执行脚本隐藏webdriver属性
            driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            logger.info("Chrome driver setup successfully")
            return driver
            
        except Exception as e:
            logger.error(f"Failed to setup Chrome driver: {e}")
            return None
    
    def get_job_detailed_info(self, driver: webdriver.Chrome, job_url: str) -> tuple[str, str]:
        """获取职位详细信息，包括描述和工作类型"""
        if job_url == 'N/A' or not job_url:
            return 'N/A', 'N/A'
        
        try:
            logger.debug(f"Fetching detailed info for: {job_url}")
            
            # 打开新标签页
            driver.execute_script("window.open('');")
            driver.switch_to.window(driver.window_handles[1])
            
            # 访问详细页面
            driver.get(job_url)
            
            # 等待页面加载
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, 'div[data-automation="jobAdDetails"]'))
                )
            except TimeoutException:
                logger.warning(f"Page load timeout for {job_url}")
            
            # 获取详细描述
            description_selectors = [
                'div[data-automation="jobAdDetails"]',
                'div[data-automation="jobDescription"]',
                'section div[data-automation="jobAdDetails"]',
                'div.jobAdDetails',
                'div[class*="jobAd"]'
            ]
            
            detailed_description = 'N/A'
            for selector in description_selectors:
                try:
                    desc_elem = driver.find_element(By.CSS_SELECTOR, selector)
                    if desc_elem and desc_elem.text.strip():
                        detailed_description = desc_elem.text.strip()
                        logger.debug(f"Successfully got description using selector: {selector}")
                        break
                except NoSuchElementException:
                    continue
                except Exception as e:
                    logger.debug(f"Error with selector {selector}: {e}")
                    continue
            
            # 获取工作类型
            work_type_selectors = [
                'span[data-automation="job-detail-work-type"] a',
                'span[data-automation="job-detail-work-type"]',
                'a[href*="full-time"]',
                'a[href*="part-time"]', 
                'a[href*="casual"]'
            ]
            
            work_type = 'N/A'
            for selector in work_type_selectors:
                try:
                    work_type_elem = driver.find_element(By.CSS_SELECTOR, selector)
                    if work_type_elem and work_type_elem.text.strip():
                        work_type_text = work_type_elem.text.strip()
                        # 标准化工作类型文本
                        if 'full time' in work_type_text.lower() or 'full-time' in work_type_text.lower():
                            work_type = 'Full time'
                        elif 'part time' in work_type_text.lower() or 'part-time' in work_type_text.lower():
                            work_type = 'Part time'  
                        elif 'casual' in work_type_text.lower():
                            work_type = 'Casual'
                        elif 'contract' in work_type_text.lower():
                            work_type = 'Contract'
                        elif 'temporary' in work_type_text.lower():
                            work_type = 'Temporary'
                        else:
                            work_type = work_type_text
                        break
                except NoSuchElementException:
                    continue
                except Exception:
                    continue
            
            # 关闭当前标签页并切换回主页面
            driver.close()
            driver.switch_to.window(driver.window_handles[0])
            
            return detailed_description, work_type
            
        except Exception as e:
            logger.error(f"Error getting detailed info for {job_url}: {e}")
            
            # 确保切换回主页面
            try:
                if len(driver.window_handles) > 1:
                    driver.close()
                    driver.switch_to.window(driver.window_handles[0])
            except:
                pass
            
            return 'N/A', 'N/A'
    
    def get_job_basic_info(self, article) -> Dict[str, Any]:
        """从工作卡片中提取基本信息"""
        job = {}
        
        try:
            # 职位标题
            title_selectors = [
                'a[data-automation="jobTitle"]',
                'h3 a',
                'a[href*="/job/"]'
            ]
            
            title_elem = None
            for selector in title_selectors:
                try:
                    title_elem = article.find_element(By.CSS_SELECTOR, selector)
                    break
                except:
                    continue
            
            job['title'] = title_elem.text.strip() if title_elem else 'N/A'
            
            # 公司名称
            company_selectors = [
                'a[data-automation="jobCompany"]',
                'span[data-automation="jobCompany"]',
                '.company a',
                'span.company'
            ]
            
            company_elem = None
            for selector in company_selectors:
                try:
                    company_elem = article.find_element(By.CSS_SELECTOR, selector)
                    break
                except:
                    continue
            
            job['company'] = company_elem.text.strip() if company_elem else 'N/A'
            
            # 地点
            location_selectors = [
                'span[data-automation="jobCardLocation"]',
                'a[data-automation="jobLocation"]',
                '.location'
            ]
            
            location_elem = None
            for selector in location_selectors:
                try:
                    location_elem = article.find_element(By.CSS_SELECTOR, selector)
                    break
                except:
                    continue
            
            job['location'] = location_elem.text.strip() if location_elem else 'N/A'
            
            # 薪资
            salary_selectors = [
                'span[data-automation="jobSalary"]',
                '.salary'
            ]
            
            salary_elem = None
            for selector in salary_selectors:
                try:
                    salary_elem = article.find_element(By.CSS_SELECTOR, selector)
                    break
                except:
                    continue
            
            job['salary'] = salary_elem.text.strip() if salary_elem else 'N/A'
            
            # 工作URL
            if title_elem and title_elem.get_attribute('href'):
                job['url'] = title_elem.get_attribute('href').split('?')[0]
            else:
                job['url'] = 'N/A'
            
            return job
            
        except Exception as e:
            logger.error(f"Error extracting job basic info: {e}")
            return {}

    def process_jobs_until_target(
        self, 
        driver: webdriver.Chrome, 
        job_required: int,
        task_id: UUID,
        user_id: UUID,
        db: Session
    ) -> List[AgentFoundJobs]:
        """处理工作直到达到目标数量"""
        saved_jobs = []
        current_page = 1
        max_pages = 20  # 设置最大页数限制，避免无限循环
        
        while len(saved_jobs) < job_required and current_page <= max_pages:
            try:
                logger.info(f"Processing page {current_page}, current saved jobs: {len(saved_jobs)}/{job_required}")
                
                # 等待页面加载
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.TAG_NAME, "article"))
                )
                
                # 尝试多种可能的文章选择器
                selectors_to_try = [
                    'article[data-automation="normalJob"]',
                    'article[data-testid="jobCard"]',
                    'div[data-automation="jobListing"]',
                    'article'
                ]
                
                articles = []
                for selector in selectors_to_try:
                    try:
                        articles = driver.find_elements(By.CSS_SELECTOR, selector)
                        if articles:
                            logger.info(f"Found {len(articles)} job articles using selector: {selector}")
                            break
                    except:
                        continue
                
                if not articles:
                    logger.warning(f"No job articles found on page {current_page}")
                    break
                
                # 逐个处理工作
                page_processed = 0
                for i, article in enumerate(articles):
                    if len(saved_jobs) >= job_required:
                        logger.info(f"Reached target of {job_required} jobs")
                        break
                    
                    try:
                        logger.debug(f"Processing job {i+1}/{len(articles)} on page {current_page}")
                        
                        # 获取基本信息
                        job_basic = self.get_job_basic_info(article)
                        if not job_basic or job_basic.get('title') == 'N/A' or job_basic.get('company') == 'N/A':
                            logger.debug("Skipping job with missing basic info")
                            continue
                        
                        job_url = job_basic.get('url', '')
                        
                        # 检查是否已存在
                        if self.check_job_exists(db, user_id, job_url):
                            logger.debug(f"Job already exists, skipping: {job_url}")
                            continue
                        
                        # 获取详细信息
                        detailed_description, work_type = self.get_job_detailed_info(driver, job_url)
                        job_basic['detailed_description'] = detailed_description
                        job_basic['work_type'] = work_type
                        
                        # 保存到数据库
                        saved_job = self.save_single_job_to_database(db, job_basic, task_id, user_id)
                        if saved_job:
                            saved_jobs.append(saved_job)
                            logger.info(f"Successfully saved job {len(saved_jobs)}/{job_required}: {saved_job.title}")
                        
                        page_processed += 1
                        
                        # 添加延迟
                        time.sleep(random.uniform(2, 4))
                        
                    except Exception as e:
                        logger.error(f"Error processing job {i+1}: {e}")
                        continue
                
                # 如果已达到目标或当前页面没有处理任何工作，停止
                if len(saved_jobs) >= job_required:
                    break
                    
                if page_processed == 0:
                    logger.warning(f"No valid jobs processed on page {current_page}")
                    break
                
                # 尝试进入下一页
                if current_page < max_pages:
                    try:
                        next_buttons = driver.find_elements(By.CSS_SELECTOR, 'a[aria-label="Go to next page"]')
                        if not next_buttons:
                            next_buttons = driver.find_elements(By.CSS_SELECTOR, 'a[data-automation="page-next"]')
                        
                        if next_buttons and next_buttons[0].is_enabled():
                            logger.info(f"Moving to page {current_page + 1}")
                            driver.execute_script("arguments[0].click();", next_buttons[0])
                            current_page += 1
                            time.sleep(random.uniform(3, 6))
                        else:
                            logger.info("No more pages available")
                            break
                    except Exception as e:
                        logger.error(f"Error navigating to next page: {e}")
                        break
                else:
                    logger.info(f"Reached maximum page limit ({max_pages})")
                    break
                    
            except TimeoutException:
                logger.error(f"Page load timeout on page {current_page}")
                break
            except Exception as e:
                logger.error(f"Error processing page {current_page}: {e}")
                break
        
        logger.info(f"Finished processing. Saved {len(saved_jobs)} jobs out of {job_required} required")
        return saved_jobs
    
    def calculate_post_date(self, posting_age: str) -> str:
        """计算发布日期"""
        today = date.today()
        if posting_age == 'N/A':
            return today.strftime('%d/%m/%Y')
        
        number = ''.join(filter(str.isdigit, posting_age))
        if number:
            if 'h' in posting_age.lower():
                return today.strftime('%d/%m/%Y')
            else:
                days_ago = int(number)
                post_date = today - timedelta(days=days_ago)
                return post_date.strftime('%d/%m/%Y')
        else:
            return today.strftime('%d/%m/%Y')
    
    def check_job_exists(self, db: Session, user_id: UUID, job_url: str) -> bool:
        """Check if a job already exists for this user"""
        from sqlmodel import select
        
        if not job_url or job_url == 'N/A':
            return False
            
        try:
            existing_job = db.exec(
                select(AgentFoundJobs).where(
                    AgentFoundJobs.user_id == user_id,
                    AgentFoundJobs.job_url == job_url
                )
            ).first()
            
            return existing_job is not None
        except Exception as e:
            logger.error(f"Error checking job existence: {e}")
            return False

    def save_single_job_to_database(
        self,
        db: Session,
        job_data: Dict[str, Any],
        task_id: UUID,
        user_id: UUID
    ) -> Optional[AgentFoundJobs]:
        """Save a single job to database if it doesn't exist"""
        try:
            # Skip if title or company is missing
            if job_data.get('title') == 'N/A' or job_data.get('company') == 'N/A':
                logger.debug("Skipping job with missing title or company")
                return None
            
            job_url = job_data.get('url', '')
            
            # Check if job already exists for this user
            if self.check_job_exists(db, user_id, job_url):
                logger.info(f"Job already exists for user {user_id}: {job_url}")
                return None
            
            # Create new job record
            job = AgentFoundJobs(
                agent_task_id=task_id,
                user_id=user_id,
                title=job_data['title'],
                company=job_data['company'],
                location=job_data.get('location'),
                salary=job_data.get('salary'),
                job_url=job_url,
                work_type=job_data.get('work_type'),
                detailed_description=job_data.get('detailed_description'),
                source_platform="seek",
                application_status="agent_found"
            )
            
            db.add(job)
            db.commit()
            db.refresh(job)
            
            logger.info(f"Saved new job to database: {job.title} at {job.company}")
            return job
            
        except Exception as e:
            logger.error(f"Error saving single job to database: {e}")
            db.rollback()
            raise
    
    async def scrape_jobs_async(
        self,
        job_titles: List[str],
        location: str = "Sydney NSW",
        job_required: int = 5,
        task_id: UUID = None,
        user_id: UUID = None,
        db: Session = None
    ) -> List[AgentFoundJobs]:
        """Asynchronously scrape jobs from Seek based on required job count"""
        all_jobs = []
        
        def scrape_sync():
            driver = self.setup_driver()
            if not driver:
                raise Exception("Failed to setup Chrome driver")
            
            try:
                all_saved_jobs = []
                jobs_per_title = max(1, job_required // len(job_titles))  # 分配每个职位标题的目标数量
                remaining_jobs = job_required
                
                for i, job_title in enumerate(job_titles):
                    if remaining_jobs <= 0:
                        break
                        
                    # 最后一个职位标题处理剩余的所有工作
                    current_target = remaining_jobs if i == len(job_titles) - 1 else min(jobs_per_title, remaining_jobs)
                    
                    logger.info(f"Scraping jobs for: {job_title} (target: {current_target} jobs)")
                    
                    # 构建搜索URL
                    search_url = f"https://www.seek.com.au/jobs?keywords={job_title.replace(' ', '%20')}&where={location.replace(' ', '%20')}"
                    logger.info(f"Visiting URL: {search_url}")
                    
                    driver.get(search_url)
                    time.sleep(random.uniform(3, 6))
                    
                    # 检查是否被重定向或被阻止
                    current_url = driver.current_url
                    if "blocked" in current_url.lower() or "captcha" in current_url.lower():
                        logger.error("Blocked by website or captcha required")
                        continue
                    
                    # 处理当前职位的工作直到达到目标数量
                    title_jobs = self.process_jobs_until_target(
                        driver, current_target, task_id, user_id, db
                    )
                    
                    all_saved_jobs.extend(title_jobs)
                    remaining_jobs -= len(title_jobs)
                    
                    logger.info(f"Completed {job_title}: saved {len(title_jobs)} jobs. Remaining target: {remaining_jobs}")
                    
                    # 在不同职位之间等待
                    if i < len(job_titles) - 1 and remaining_jobs > 0:
                        wait_time = random.uniform(5, 10)
                        logger.info(f"Waiting {wait_time:.1f} seconds before next job title")
                        time.sleep(wait_time)
                
                return all_saved_jobs
                
            finally:
                driver.quit()
        
        # Run scraping in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        all_jobs = await loop.run_in_executor(None, scrape_sync)
        
        logger.info(f"Scraping completed. Total jobs saved: {len(all_jobs)} out of {job_required} required")
        return all_jobs
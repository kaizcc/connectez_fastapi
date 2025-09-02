"""
Job scraper service for extracting job information from URLs.
This module provides functionality to scrape job details from Seek URLs.
"""
import logging
import time
import random
from typing import Dict, Any, Optional
from urllib.parse import urlparse

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from pydantic import BaseModel, HttpUrl

logger = logging.getLogger(__name__)


class ScrapedJobData(BaseModel):
    """Scraped job data model"""
    title: str
    company: Optional[str] = None
    description: Optional[str] = None
    job_url: str
    success: bool = True
    error_message: Optional[str] = None


class ScraperService:
    """Job scraper service for extracting job information from URLs."""
    
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
    
    def validate_seek_url(self, url: str) -> bool:
        """验证是否为有效的Seek URL"""
        try:
            parsed = urlparse(url)
            return (
                parsed.netloc in ['www.seek.com.au', 'seek.com.au'] and 
                '/job/' in parsed.path
            )
        except Exception:
            return False
    
    def extract_job_info_from_url(self, job_url: str) -> ScrapedJobData:
        """从单个Seek URL提取工作信息"""
        if not self.validate_seek_url(job_url):
            return ScrapedJobData(
                title="",
                job_url=job_url,
                success=False,
                error_message="Invalid Seek URL. Please provide a valid Seek job URL (e.g., https://www.seek.com.au/job/...)"
            )
        
        driver = self.setup_driver()
        if not driver:
            return ScrapedJobData(
                title="",
                job_url=job_url,
                success=False,
                error_message="Failed to setup browser driver"
            )
        
        try:
            logger.info(f"Extracting job info from: {job_url}")
            
            # 访问页面
            driver.get(job_url)
            
            # 等待页面加载
            try:
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.TAG_NAME, 'h1'))
                )
            except TimeoutException:
                logger.warning(f"Page load timeout for {job_url}")
                return ScrapedJobData(
                    title="",
                    job_url=job_url,
                    success=False,
                    error_message="Page load timeout. The page may be temporarily unavailable."
                )
            
            # 提取职位标题
            title = self._extract_title(driver)
            if not title or title == 'N/A':
                return ScrapedJobData(
                    title="",
                    job_url=job_url,
                    success=False,
                    error_message="Could not extract job title. This may not be a valid job posting page."
                )
            
            # 提取公司名称
            company = self._extract_company(driver)
            
            # 提取详细描述
            description = self._extract_description(driver)
            
            logger.info(f"Successfully extracted job info: {title} at {company}")
            
            return ScrapedJobData(
                title=title,
                company=company if company != 'N/A' else None,
                description=description if description != 'N/A' else None,
                job_url=job_url,
                success=True
            )
            
        except Exception as e:
            logger.error(f"Error extracting job info from {job_url}: {e}")
            return ScrapedJobData(
                title="",
                job_url=job_url,
                success=False,
                error_message=f"Failed to extract job information: {str(e)}"
            )
        finally:
            try:
                driver.quit()
            except:
                pass
    
    def _extract_title(self, driver: webdriver.Chrome) -> str:
        """提取职位标题"""
        title_selectors = [
            'h1[data-automation="job-detail-title"]',
            'h1',
            '[data-automation="job-detail-title"]',
            'span[data-automation="job-detail-title"]'
        ]
        
        for selector in title_selectors:
            try:
                title_elem = driver.find_element(By.CSS_SELECTOR, selector)
                if title_elem and title_elem.text.strip():
                    title = title_elem.text.strip()
                    logger.debug(f"Successfully extracted title using selector: {selector}")
                    return title
            except NoSuchElementException:
                continue
            except Exception as e:
                logger.debug(f"Error with title selector {selector}: {e}")
                continue
        
        logger.warning("Could not extract job title")
        return 'N/A'
    
    def _extract_company(self, driver: webdriver.Chrome) -> str:
        """提取公司名称"""
        company_selectors = [
            # 最新的Seek页面结构 - advertiser-name
            'span[data-automation="advertiser-name"]',
            'button[data-automation="advertiser-name"] span[data-automation="advertiser-name"]',
            'button[data-automation="advertiser-name"]',
            '[data-automation="advertiser-name"]',
            # 旧的选择器作为备用
            'span[data-automation="job-detail-company-name"] a',
            'span[data-automation="job-detail-company-name"]',
            'a[data-automation="job-detail-company-name"]',
            '[data-automation="job-detail-company-name"]',
            'span[data-automation="job-company-name"]'
        ]
        
        for selector in company_selectors:
            try:
                company_elem = driver.find_element(By.CSS_SELECTOR, selector)
                if company_elem and company_elem.text.strip():
                    company = company_elem.text.strip()
                    logger.debug(f"Successfully extracted company using selector: {selector}")
                    return company
            except NoSuchElementException:
                continue
            except Exception as e:
                logger.debug(f"Error with company selector {selector}: {e}")
                continue
        
        logger.warning("Could not extract company name")
        return 'N/A'
    
    def _extract_description(self, driver: webdriver.Chrome) -> str:
        """提取详细描述 (long description)"""
        description_selectors = [
            'div[data-automation="jobAdDetails"]',
            'div[data-automation="jobDescription"]',
            'section div[data-automation="jobAdDetails"]',
            'div.jobAdDetails',
            'div[class*="jobAd"]',
            '[data-automation="jobAdDetails"]'
        ]
        
        for selector in description_selectors:
            try:
                desc_elem = driver.find_element(By.CSS_SELECTOR, selector)
                if desc_elem and desc_elem.text.strip():
                    description = desc_elem.text.strip()
                    logger.debug(f"Successfully extracted description using selector: {selector}")
                    return description
            except NoSuchElementException:
                continue
            except Exception as e:
                logger.debug(f"Error with description selector {selector}: {e}")
                continue
        
        logger.warning("Could not extract job description")
        return 'N/A'
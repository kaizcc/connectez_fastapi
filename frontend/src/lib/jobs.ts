import api from './api';

// 类型定义
export interface Job {
  id: string;
  user_id: string;
  title: string;
  company?: string;
  description?: string;
  job_url?: string;
  resume_id?: string;
  cover_letter?: any;
  application_status: string;
  applied_at?: string;
  notes?: string;
  source?: string;
  score?: number;
  created_at: string;
  updated_at: string;
}

export interface JobCreate {
  title: string;
  company?: string;
  description?: string;
  job_url?: string;
  application_status?: string;
  notes?: string;
  source?: string;
}

export interface JobUpdate {
  title?: string;
  company?: string;
  description?: string;
  job_url?: string;
  application_status?: string;
  notes?: string;
  source?: string;
  applied_at?: string;
  score?: number;
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface JobStats {
  total_jobs: number;
  applied_jobs: number;
  saved_jobs: number;
  other_jobs: number;
}

export interface UrlScrapeRequest {
  url: string;
}

export interface ScrapedJobResponse {
  title: string;
  company?: string;
  description?: string;
  job_url: string;
  success: boolean;
  error_message?: string;
}

export const jobsApi = {
  // 获取工作列表
  getJobs: async (params?: {
    status?: string;
    page?: number;
    per_page?: number;
  }): Promise<JobListResponse> => {
    const response = await api.get('/jobs/', { params });
    return response.data;
  },

  // 获取工作统计
  getJobStats: async (): Promise<JobStats> => {
    const response = await api.get('/jobs/stats');
    return response.data;
  },

  // 获取单个工作详情
  getJob: async (jobId: string): Promise<Job> => {
    const response = await api.get(`/jobs/${jobId}`);
    return response.data;
  },

  // 创建工作
  createJob: async (jobData: JobCreate): Promise<Job> => {
    const response = await api.post('/jobs/', jobData);
    return response.data;
  },

  // 更新工作
  updateJob: async (jobId: string, jobData: JobUpdate): Promise<Job> => {
    const response = await api.put(`/jobs/${jobId}`, jobData);
    return response.data;
  },

  // 删除工作
  deleteJob: async (jobId: string): Promise<void> => {
    await api.delete(`/jobs/${jobId}`);
  },

  // 从URL爬取工作信息
  scrapeJobFromUrl: async (urlData: UrlScrapeRequest): Promise<ScrapedJobResponse> => {
    const response = await api.post('/jobs/scrape-url', urlData);
    return response.data;
  },
};

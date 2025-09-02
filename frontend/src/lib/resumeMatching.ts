/**
 * Resume-Job Matching API client
 * Handles communication with the resume matching backend API
 */
import api from './api';
import type { 
  ResumeJobMatchingRequest, 
  ResumeJobMatchingResponse,
  Resume,
  AgentTaskResponse 
} from '../types';

export const resumeMatchingApi = {
  /**
   * Execute resume-job matching analysis
   */
  async executeResumeJobMatching(request: ResumeJobMatchingRequest): Promise<ResumeJobMatchingResponse> {
    const response = await api.post('/tasks/resume-job-matching', request);
    return response.data;
  },

  /**
   * Get user's resumes for selection
   */
  async getUserResumes(): Promise<Resume[]> {
    try {
      const response = await api.get('/tasks/resumes/');
      return response.data;
    } catch (error) {
      console.error('Error fetching resumes:', error);
      return [];
    }
  },

  /**
   * Get user's scraping tasks for selection
   */
  async getUserScrapingTasks(): Promise<AgentTaskResponse[]> {
    const response = await api.get('/tasks/?status=completed');
    // Filter for only seek_scraper tasks
    return response.data.filter(task => task.task_type === 'seek_scraper');
  },

  /**
   * Get jobs with analysis results
   */
  async getJobsWithAnalysis(taskId?: string): Promise<any[]> {
    const url = taskId ? `/tasks/found-jobs/?task_id=${taskId}` : '/tasks/found-jobs/';
    const response = await api.get(url);
    // Filter for jobs that have analysis results
    return response.data.filter(job => job.match_score !== null && job.match_score !== undefined);
  }
};

/**
 * Helper functions for formatting and validation
 */
export const resumeMatchingHelpers = {
  /**
   * Format AI analysis for display
   */
  formatAnalysis: (analysis: any): string => {
    if (!analysis) return '暂无分析结果';
    
    if (typeof analysis === 'object') {
      const { summary, strengths, gaps, recommendations } = analysis;
      let formatted = '';
      
      if (summary) formatted += `**概述**: ${summary}\n\n`;
      if (strengths?.length) formatted += `**优势**: ${strengths.join(', ')}\n\n`;
      if (gaps?.length) formatted += `**不足**: ${gaps.join(', ')}\n\n`;
      if (recommendations?.length) formatted += `**建议**: ${recommendations.join(', ')}`;
      
      return formatted || '分析已完成';
    }
    
    return String(analysis);
  },

  /**
   * Get score color based on matching score
   */
  getScoreColor: (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-green-500';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  },

  /**
   * Get score badge color
   */
  getScoreBadgeColor: (score: number): string => {
    if (score >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 80) return 'bg-green-50 text-green-700 border-green-200';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (score >= 60) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (score >= 50) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  },

  /**
   * Get score description
   */
  getScoreDescription: (score: number): string => {
    if (score >= 90) return '极度匹配';
    if (score >= 80) return '优秀匹配';
    if (score >= 70) return '良好匹配';
    if (score >= 60) return '一般匹配';
    if (score >= 50) return '中等匹配';
    return '匹配度较低';
  },

  /**
   * Validate matching request
   */
  validateMatchingRequest: (request: Partial<ResumeJobMatchingRequest>): string[] => {
    const errors: string[] = [];
    
    if (!request.resume_id) {
      errors.push('请选择一个简历');
    }
    
    if (!request.task_id) {
      errors.push('请选择一个爬虫任务');
    }
    
    if (!request.ai_model) {
      errors.push('请选择AI模型');
    }
    
    return errors;
  }
};

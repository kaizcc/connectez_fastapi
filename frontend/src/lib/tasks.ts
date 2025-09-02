import api from './api';
import type { 
  SeekScraperRequest, 
  SeekScraperResponse, 
  AgentTaskResponse, 
  AgentFoundJob 
} from '../types';

// 任务管理相关API调用

/**
 * 执行Seek爬虫任务
 */
export const executeSeekScraper = async (data: SeekScraperRequest): Promise<SeekScraperResponse> => {
  try {
    const response = await api.post('/tasks/seek-scraper', data);
    return response.data;
  } catch (error: any) {
    console.error('执行Seek爬虫失败:', error);
    throw new Error(error.response?.data?.detail || '执行爬虫失败');
  }
};

/**
 * 获取用户的任务列表
 */
export const getUserTasks = async (params?: {
  status?: string;
  page?: number;
  per_page?: number;
}): Promise<AgentTaskResponse[]> => {
  try {
    const response = await api.get('/tasks/', { params });
    return response.data;
  } catch (error: any) {
    console.error('获取任务列表失败:', error);
    throw new Error(error.response?.data?.detail || '获取任务列表失败');
  }
};

/**
 * 获取特定任务详情
 */
export const getTaskById = async (taskId: string): Promise<AgentTaskResponse> => {
  try {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  } catch (error: any) {
    console.error('获取任务详情失败:', error);
    throw new Error(error.response?.data?.detail || '获取任务详情失败');
  }
};

/**
 * 更新任务状态
 */
export const updateTask = async (
  taskId: string, 
  data: Partial<AgentTaskResponse>
): Promise<AgentTaskResponse> => {
  try {
    const response = await api.put(`/tasks/${taskId}`, data);
    return response.data;
  } catch (error: any) {
    console.error('更新任务失败:', error);
    throw new Error(error.response?.data?.detail || '更新任务失败');
  }
};

/**
 * 获取找到的工作列表
 */
export const getFoundJobs = async (params?: {
  task_id?: string;
  saved_only?: boolean;
  page?: number;
  per_page?: number;
}): Promise<AgentFoundJob[]> => {
  try {
    const response = await api.get('/tasks/found-jobs/', { params });
    return response.data;
  } catch (error: any) {
    console.error('获取找到的工作失败:', error);
    throw new Error(error.response?.data?.detail || '获取找到的工作失败');
  }
};

/**
 * 获取特定工作详情
 */
export const getFoundJobById = async (jobId: string): Promise<AgentFoundJob> => {
  try {
    const response = await api.get(`/tasks/found-jobs/${jobId}`);
    return response.data;
  } catch (error: any) {
    console.error('获取工作详情失败:', error);
    throw new Error(error.response?.data?.detail || '获取工作详情失败');
  }
};

/**
 * 更新找到的工作状态（如标记为已保存）
 */
export const updateFoundJob = async (
  jobId: string, 
  data: Partial<AgentFoundJob>
): Promise<AgentFoundJob> => {
  try {
    const response = await api.put(`/tasks/found-jobs/${jobId}`, data);
    return response.data;
  } catch (error: any) {
    console.error('更新工作状态失败:', error);
    throw new Error(error.response?.data?.detail || '更新工作状态失败');
  }
};

/**
 * 标记工作为已保存
 */
export const saveJob = async (jobId: string): Promise<AgentFoundJob> => {
  return updateFoundJob(jobId, { saved: true });
};

/**
 * 取消保存工作
 */
export const unsaveJob = async (jobId: string): Promise<AgentFoundJob> => {
  return updateFoundJob(jobId, { saved: false });
};

// 任务状态相关工具函数

/**
 * 获取任务状态的中文显示
 */
export const getTaskStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': '等待中',
    'running': '执行中',
    'completed': '已完成',
    'failed': '执行失败',
    'cancelled': '已取消',
    'paused': '已暂停',
    'scheduled': '已计划',
    'recurring': '循环执行'
  };
  return statusMap[status] || status;
};

/**
 * 获取任务状态的颜色
 */
export const getTaskStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    'pending': 'text-yellow-600 bg-yellow-100',
    'running': 'text-blue-600 bg-blue-100',
    'completed': 'text-green-600 bg-green-100',
    'failed': 'text-red-600 bg-red-100',
    'cancelled': 'text-gray-600 bg-gray-100',
    'paused': 'text-orange-600 bg-orange-100',
    'scheduled': 'text-purple-600 bg-purple-100',
    'recurring': 'text-indigo-600 bg-indigo-100'
  };
  return colorMap[status] || 'text-gray-600 bg-gray-100';
};

/**
 * 格式化执行结果显示
 */
export const formatExecutionResult = (result: any): string => {
  if (!result) return '暂无结果';
  
  if (typeof result === 'object') {
    const { jobs_found, jobs_required, job_titles_searched, location, completion_rate } = result;
    return `找到 ${jobs_found || 0} 个工作，目标 ${jobs_required || 0} 个，搜索了 ${job_titles_searched?.length || 0} 个职位，地点：${location || '未指定'}，完成率：${completion_rate || '未知'}`;
  }
  
  return String(result);
};

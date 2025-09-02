import api from './api';
import type { 
  JobSearchTaskRequest, 
  TaskStartResponse, 
  TaskStatusResponse,
  AgentTask,
  TaskListResponse,
  AgentStats,
  BrowserTaskRequest,
  BrowserTaskResult,
  AgentStatusResponse
} from '@/types';

// Agent API 调用函数

/**
 * 启动工作搜索任务
 */
export const startJobSearchTask = async (taskRequest: JobSearchTaskRequest): Promise<TaskStartResponse> => {
  const response = await api.post<TaskStartResponse>('/agent/job-search/start', taskRequest);
  return response.data;
};

/**
 * 获取任务状态
 */
export const getTaskStatus = async (taskId: string): Promise<TaskStatusResponse> => {
  const response = await api.get<TaskStatusResponse>(`/agent/job-search/${taskId}/status`);
  return response.data;
};

/**
 * 取消任务
 */
export const cancelTask = async (taskId: string): Promise<{ message: string; task_id: string }> => {
  const response = await api.post(`/agent/job-search/${taskId}/cancel`);
  return response.data;
};

/**
 * 获取用户任务列表
 */
export const getUserTasks = async (params: {
  status?: string;
  page?: number;
  per_page?: number;
}): Promise<TaskListResponse> => {
  const response = await api.get<TaskListResponse>('/agent/tasks', { params });
  return response.data;
};

/**
 * 获取任务详情
 */
export const getTaskDetails = async (taskId: string): Promise<AgentTask> => {
  const response = await api.get<AgentTask>(`/agent/tasks/${taskId}`);
  return response.data;
};

/**
 * 获取代理统计信息
 */
export const getAgentStats = async (): Promise<AgentStats> => {
  const response = await api.get<AgentStats>('/agent/stats');
  return response.data;
};

/**
 * 健康检查
 */
export const healthCheck = async (): Promise<{ status: string; service: string }> => {
  const response = await api.get('/agent/health');
  return response.data;
};

// 任务状态相关的工具函数

/**
 * 获取任务状态的显示文本
 */
export const getTaskStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': '等待中',
    'running': '运行中',
    'completed': '已完成',
    'failed': '失败',
    'cancelled': '已取消',
    'paused': '已暂停'
  };
  return statusMap[status] || status;
};

/**
 * 获取任务状态的颜色
 */
export const getTaskStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    'pending': 'yellow',
    'running': 'blue',
    'completed': 'green',
    'failed': 'red',
    'cancelled': 'gray',
    'paused': 'orange'
  };
  return colorMap[status] || 'gray';
};

/**
 * 检查任务是否可以取消
 */
export const canCancelTask = (status: string): boolean => {
  return ['pending', 'running', 'paused'].includes(status);
};

/**
 * 检查任务是否已完成（包括成功和失败）
 */
export const isTaskFinished = (status: string): boolean => {
  return ['completed', 'failed', 'cancelled'].includes(status);
};

/**
 * 格式化执行时间
 */
export const formatExecutionTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${minutes}分钟`;
  }
};

// 智能浏览器任务 API 函数

/**
 * 执行智能浏览器任务
 */
export const executeBrowserTask = async (taskRequest: BrowserTaskRequest): Promise<BrowserTaskResult> => {
  const response = await api.post<BrowserTaskResult>('/agent/complete-browser-task', taskRequest);
  return response.data;
};

/**
 * 获取 Agent 服务状态
 */
export const getAgentServiceStatus = async (): Promise<AgentStatusResponse> => {
  const response = await api.get<AgentStatusResponse>('/agent/status');
  return response.data;
};

/**
 * 测试 LLM 连接
 */
export const testLLMConnection = async (): Promise<Record<string, any>> => {
  const response = await api.get<Record<string, any>>('/agent/test-llm');
  return response.data;
};

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { getUserTasks, getTaskStatusText, getTaskStatusColor, formatExecutionResult } from '../lib/tasks';
import type { AgentTaskResponse } from '../types';

interface TaskListProps {
  refreshTrigger?: number;
  onTaskSelect?: (task: AgentTaskResponse) => void;
}

const TaskList: React.FC<TaskListProps> = ({ refreshTrigger, onTaskSelect }) => {
  const [tasks, setTasks] = useState<AgentTaskResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = statusFilter ? { status: statusFilter } : undefined;
      const taskList = await getUserTasks(params);
      setTasks(taskList);
    } catch (err: any) {
      setError(err.message || '获取任务列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, refreshTrigger]);

  const formatDateTime = (dateStr?: string): string => {
    if (!dateStr) return '未知';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const getExecutionTime = (task: AgentTaskResponse): string => {
    if (!task.started_at) return '未开始';
    if (!task.completed_at) return '执行中...';
    
    const start = new Date(task.started_at);
    const end = new Date(task.completed_at);
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}秒`;
    if (duration < 3600) return `${Math.round(duration / 60)}分钟`;
    return `${Math.round(duration / 3600)}小时`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">加载任务列表...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchTasks} variant="outline">
              重新加载
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>📋 任务列表</CardTitle>
            <CardDescription>查看和管理您的爬虫任务</CardDescription>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="">所有状态</option>
              <option value="pending">等待中</option>
              <option value="running">执行中</option>
              <option value="completed">已完成</option>
              <option value="failed">执行失败</option>
            </select>
            <Button onClick={fetchTasks} variant="outline" size="sm">
              🔄 刷新
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">暂无任务</p>
            <p className="text-sm text-gray-400 mt-1">创建一个新任务开始使用</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onTaskSelect?.(task)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {task.task_description || `${task.task_type} 任务`}
                    </h3>
                    <p className="text-sm text-gray-600">
                      任务ID: {task.id.slice(0, 8)}...
                    </p>
                  </div>
                  <Badge className={getTaskStatusColor(task.status)}>
                    {getTaskStatusText(task.status)}
                  </Badge>
                </div>

                {/* 任务参数 */}
                {task.task_instructions && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-1">搜索参数:</p>
                    <div className="text-sm text-gray-700">
                      {task.task_instructions.job_titles && (
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2 mb-1">
                          职位: {task.task_instructions.job_titles.join(', ')}
                        </span>
                      )}
                      {task.task_instructions.location && (
                        <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-2 mb-1">
                          地点: {task.task_instructions.location}
                        </span>
                      )}
                      {task.task_instructions.job_required && (
                        <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs mr-2 mb-1">
                          目标: {task.task_instructions.job_required}个工作
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 执行结果 */}
                {task.execution_result && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-1">执行结果:</p>
                    <p className="text-sm text-gray-700">
                      {formatExecutionResult(task.execution_result)}
                    </p>
                  </div>
                )}

                {/* 错误信息 */}
                {task.other_message && task.status === 'failed' && (
                  <div className="mb-2">
                    <p className="text-xs text-red-500 mb-1">错误信息:</p>
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {task.other_message}
                    </p>
                  </div>
                )}

                {/* 时间信息 */}
                <div className="flex justify-between items-center text-xs text-gray-500 mt-3">
                  <div>
                    <span>创建: {formatDateTime(task.created_at)}</span>
                    {task.started_at && (
                      <span className="ml-4">开始: {formatDateTime(task.started_at)}</span>
                    )}
                  </div>
                  <div>
                    {task.completed_at && (
                      <span>完成: {formatDateTime(task.completed_at)}</span>
                    )}
                    <span className="ml-4">耗时: {getExecutionTime(task)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskList;

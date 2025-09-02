import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { getFoundJobs, saveJob, unsaveJob } from '../lib/tasks';
import type { AgentFoundJob } from '../types';

interface FoundJobsListProps {
  taskId?: string;
  refreshTrigger?: number;
}

const FoundJobsList: React.FC<FoundJobsListProps> = ({ taskId, refreshTrigger }) => {
  const [jobs, setJobs] = useState<AgentFoundJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedFilter, setSavedFilter] = useState<boolean | undefined>(undefined);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params: any = {};
      
      if (taskId) params.task_id = taskId;
      if (savedFilter !== undefined) params.saved_only = savedFilter;
      
      const jobList = await getFoundJobs(params);
      setJobs(jobList);
    } catch (err: any) {
      setError(err.message || '获取工作列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [taskId, savedFilter, refreshTrigger]);

  const handleToggleSave = async (job: AgentFoundJob) => {
    try {
      const updatedJob = job.saved 
        ? await unsaveJob(job.id)
        : await saveJob(job.id);
      
      // 更新本地状态
      setJobs(prevJobs => 
        prevJobs.map(j => j.id === job.id ? updatedJob : j)
      );
    } catch (err: any) {
      console.error('更新保存状态失败:', err);
    }
  };

  const formatDateTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">加载工作列表...</span>
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
            <Button onClick={fetchJobs} variant="outline">
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
            <CardTitle>💼 找到的工作</CardTitle>
            <CardDescription>
              {taskId ? '特定任务找到的工作' : '所有找到的工作机会'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <select
              value={savedFilter === undefined ? 'all' : savedFilter ? 'saved' : 'unsaved'}
              onChange={(e) => {
                const value = e.target.value;
                setSavedFilter(
                  value === 'all' ? undefined : value === 'saved'
                );
              }}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">全部工作</option>
              <option value="saved">已保存</option>
              <option value="unsaved">未保存</option>
            </select>
            <Button onClick={fetchJobs} variant="outline" size="sm">
              🔄 刷新
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">暂无工作</p>
            <p className="text-sm text-gray-400 mt-1">
              {taskId ? '该任务还未找到工作' : '创建任务后这里会显示找到的工作'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {job.title}
                    </h3>
                    <p className="text-blue-600 font-medium mb-1">
                      {job.company}
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                      {job.location && (
                        <span className="flex items-center">
                          📍 {job.location}
                        </span>
                      )}
                      {job.work_type && (
                        <span className="flex items-center">
                          💼 {job.work_type}
                        </span>
                      )}
                      {job.salary && job.salary !== 'N/A' && (
                        <span className="flex items-center">
                          💰 {job.salary}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      onClick={() => handleToggleSave(job)}
                      variant={job.saved ? "default" : "outline"}
                      size="sm"
                    >
                      {job.saved ? '❤️ 已保存' : '🤍 保存'}
                    </Button>
                    <Badge
                      className={
                        job.saved 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {job.application_status}
                    </Badge>
                  </div>
                </div>

                {/* 工作描述预览 */}
                {job.detailed_description && job.detailed_description !== 'N/A' && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-700">
                      {expandedJob === job.id 
                        ? job.detailed_description
                        : truncateText(job.detailed_description, 200)
                      }
                    </p>
                    {job.detailed_description.length > 200 && (
                      <button
                        onClick={() => setExpandedJob(
                          expandedJob === job.id ? null : job.id
                        )}
                        className="text-blue-600 text-sm mt-1 hover:underline"
                      >
                        {expandedJob === job.id ? '收起' : '展开详情'}
                      </button>
                    )}
                  </div>
                )}

                {/* 匹配分数 */}
                {job.match_score && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">匹配度:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-32">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${job.match_score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{job.match_score}%</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>来源: {job.source_platform || 'unknown'}</span>
                    <span>发现时间: {formatDateTime(job.created_at)}</span>
                  </div>
                  <div className="flex gap-2">
                    {job.job_url && job.job_url !== 'N/A' && (
                      <Button
                        onClick={() => window.open(job.job_url, '_blank')}
                        variant="outline"
                        size="sm"
                      >
                        🔗 查看原页面
                      </Button>
                    )}
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

export default FoundJobsList;

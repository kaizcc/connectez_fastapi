import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { executeSeekScraper } from '../lib/tasks';
import type { SeekScraperRequest } from '../types';

interface TaskFormProps {
  onTaskCreated?: (taskId: string) => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ onTaskCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [jobTitles, setJobTitles] = useState('');
  const [location, setLocation] = useState('Sydney NSW');
  const [jobRequired, setJobRequired] = useState(5);
  const [taskDescription, setTaskDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 解析职位标题，支持逗号分隔
      const titles = jobTitles
        .split(',')
        .map(title => title.trim())
        .filter(title => title.length > 0);

      if (titles.length === 0) {
        throw new Error('请至少输入一个职位标题');
      }

      const request: SeekScraperRequest = {
        job_titles: titles,
        location: location.trim(),
        job_required: jobRequired,
        task_description: taskDescription.trim() || undefined
      };

      const response = await executeSeekScraper(request);
      
      setSuccess(`任务创建成功！任务ID: ${response.task_id}，找到 ${response.jobs_found} 个工作`);
      
      // 重置表单
      setJobTitles('');
      setTaskDescription('');
      
      // 通知父组件
      if (onTaskCreated) {
        onTaskCreated(response.task_id);
      }
      
    } catch (err: any) {
      setError(err.message || '创建任务失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>🚀 创建Seek爬虫任务</CardTitle>
        <CardDescription>
          输入职位信息，系统将自动搜索Seek网站并找到相关工作机会
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 职位标题 */}
          <div>
            <label htmlFor="jobTitles" className="block text-sm font-medium text-gray-700 mb-1">
              职位标题 *
            </label>
            <Input
              id="jobTitles"
              type="text"
              value={jobTitles}
              onChange={(e) => setJobTitles(e.target.value)}
              placeholder="例如：Senior Data Analyst, Data Scientist（多个职位用逗号分隔）"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              支持多个职位，用逗号分隔
            </p>
          </div>

          {/* 工作地点 */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              工作地点 *
            </label>
            <Input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="例如：Sydney NSW, Melbourne VIC"
              required
              disabled={isLoading}
            />
          </div>

          {/* 所需工作数量 */}
          <div>
            <label htmlFor="jobRequired" className="block text-sm font-medium text-gray-700 mb-1">
              所需工作数量 *
            </label>
            <Input
              id="jobRequired"
              type="number"
              min="1"
              max="50"
              value={jobRequired}
              onChange={(e) => setJobRequired(parseInt(e.target.value) || 1)}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              系统将爬取指定数量的有效工作（去重后），建议5-20个
            </p>
          </div>

          {/* 任务描述 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              任务描述（可选）
            </label>
            <Textarea
              id="description"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="为这个任务添加备注..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* 成功信息 */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          {/* 提交按钮 */}
          <Button 
            type="submit" 
            disabled={isLoading || !jobTitles.trim() || !location.trim() || jobRequired < 1}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                正在创建任务...
              </>
            ) : (
              '🔍 开始搜索工作'
            )}
          </Button>

          {/* 说明信息 */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-1">💡 使用说明</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• 爬虫会逐个搜索工作直到达到所需数量</li>
              <li>• 系统会自动去重，跳过已添加的工作</li>
              <li>• 获取每个工作的详细信息包括完整描述</li>
              <li>• 如果当前页面工作不足，会自动翻页继续</li>
              <li>• 执行时间取决于所需工作数量，请耐心等待</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TaskForm;

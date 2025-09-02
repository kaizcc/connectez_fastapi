import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { resumeMatchingApi, resumeMatchingHelpers } from '../lib/resumeMatching';
import type { 
  ResumeJobMatchingRequest, 
  Resume, 
  AgentTaskResponse 
} from '../types';

interface ResumeJobMatchingFormProps {
  onMatchingStarted: (taskId: string) => void;
}

const ResumeJobMatchingForm: React.FC<ResumeJobMatchingFormProps> = ({ onMatchingStarted }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [scrapingTasks, setScrapingTasks] = useState<AgentTaskResponse[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedAIModel, setSelectedAIModel] = useState('deepseek');
  const [taskDescription, setTaskDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [resumesData, tasksData] = await Promise.all([
        resumeMatchingApi.getUserResumes(),
        resumeMatchingApi.getUserScrapingTasks()
      ]);
      
      setResumes(resumesData);
      setScrapingTasks(tasksData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('加载数据失败，请刷新页面重试');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const request: ResumeJobMatchingRequest = {
      resume_id: selectedResumeId,
      task_id: selectedTaskId,
      ai_model: selectedAIModel,
      task_description: taskDescription.trim() || undefined
    };

    const validationErrors = resumeMatchingHelpers.validateMatchingRequest(request);
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setIsLoading(true);

    try {
      const response = await resumeMatchingApi.executeResumeJobMatching(request);
      
      setSuccess(`分析任务创建成功！任务ID: ${response.task_id}，分析了 ${response.jobs_analyzed} 个工作`);
      
      // 重置表单
      setSelectedResumeId('');
      setSelectedTaskId('');
      setTaskDescription('');
      
      // 通知父组件
      onMatchingStarted(response.task_id);
      
    } catch (err: any) {
      console.error('Error starting resume matching:', err);
      setError(err.message || '启动分析失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTask = scrapingTasks.find(task => task.id === selectedTaskId);
  const selectedResume = resumes.find(resume => resume.id === selectedResumeId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          🧠 AI简历工作匹配分析
        </CardTitle>
        <CardDescription>
          使用AI分析简历与工作岗位的匹配度，获得详细的匹配评分和改进建议
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 简历选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择简历 *
            </label>
            <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
              <SelectTrigger>
                <SelectValue placeholder="选择要分析的简历" />
              </SelectTrigger>
              <SelectContent>
                {resumes.map((resume) => (
                  <SelectItem key={resume.id} value={resume.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{resume.name}</span>
                      {resume.target_role && (
                        <span className="text-xs text-gray-500">目标职位: {resume.target_role}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedResume && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                <strong>已选择简历:</strong> {selectedResume.name}
                {selectedResume.target_role && ` (${selectedResume.target_role})`}
              </div>
            )}
          </div>

          {/* 爬虫任务选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择爬虫任务 *
            </label>
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger>
                <SelectValue placeholder="选择包含工作信息的爬虫任务" />
              </SelectTrigger>
              <SelectContent>
                {scrapingTasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{task.task_description}</span>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{new Date(task.created_at).toLocaleDateString()}</span>
                        <Badge variant="outline" className="text-xs">
                          {task.execution_result?.jobs_found || 0} 个工作
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTask && (
              <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                <strong>已选择任务:</strong> {selectedTask.task_description}
                <br />
                <span className="text-gray-600">
                  包含 {selectedTask.execution_result?.jobs_found || 0} 个工作岗位
                </span>
              </div>
            )}
          </div>

          {/* AI模型选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI模型 *
            </label>
            <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deepseek">
                  <div className="flex flex-col">
                    <span className="font-medium">DeepSeek</span>
                    <span className="text-xs text-gray-500">推荐 - 快速且准确</span>
                  </div>
                </SelectItem>
                <SelectItem value="openai">
                  <div className="flex flex-col">
                    <span className="font-medium">OpenAI GPT-3.5</span>
                    <span className="text-xs text-gray-500">经典选择</span>
                  </div>
                </SelectItem>
                <SelectItem value="google">
                  <div className="flex flex-col">
                    <span className="font-medium">Google Gemini</span>
                    <span className="text-xs text-gray-500">Google AI</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 任务描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              任务描述（可选）
            </label>
            <Textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="描述这次分析的目的或特殊要求..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* 错误信息 */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* 成功信息 */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-700">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* 提交按钮 */}
          <Button 
            type="submit" 
            disabled={isLoading || !selectedResumeId || !selectedTaskId}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                正在启动AI分析...
              </>
            ) : (
              "🚀 开始AI匹配分析"
            )}
          </Button>

          {/* 使用说明 */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-2">💡 使用说明</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• AI将分析简历与每个工作岗位的匹配度(0-100分)</li>
              <li>• 90分以上表示极度匹配，建议优先申请</li>
              <li>• 分析结果包含优势、不足和改进建议</li>
              <li>• 分析过程需要几分钟，请耐心等待</li>
              <li>• 分析完成后可在"工作"标签中查看详细结果</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ResumeJobMatchingForm;

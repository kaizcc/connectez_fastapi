import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Minus, Loader2, Search, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface JobAgentFormProps {
  onTaskCreated?: (result: any) => void;
  onCancel?: () => void;
}

interface FormData {
  job_titles: string[];
  location: string;
  job_required: number;
  task_description: string;
  resume_id: string;
  ai_model: string;
}

interface Resume {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  target_role: string;
  created_at: string;
}

export default function JobAgentForm({ onTaskCreated, onCancel }: JobAgentFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      job_titles: [],
      location: 'Sydney NSW',
      job_required: 5,
      task_description: '',
      resume_id: '',
      ai_model: 'deepseek'
    }
  });

  const selectedResumeId = watch('resume_id');

  // 加载用户简历
  useEffect(() => {
    const loadResumes = async () => {
      try {
        setLoadingResumes(true);
        const response = await api.get('/tasks/resumes/');
        setResumes(response.data);
        
        // 如果只有一个简历，自动选择
        if (response.data.length === 1) {
          setValue('resume_id', response.data[0].id);
          console.log('Auto-selected resume:', response.data[0].id);
        }
      } catch (error) {
        console.error('Failed to load resumes:', error);
      } finally {
        setLoadingResumes(false);
      }
    };

    if (user) {
      loadResumes();
    }
  }, [user, setValue]);

  const addJobTitle = () => {
    if (newJobTitle.trim() && !jobTitles.includes(newJobTitle.trim())) {
      const updatedTitles = [...jobTitles, newJobTitle.trim()];
      setJobTitles(updatedTitles);
      setValue('job_titles', updatedTitles);
      setNewJobTitle('');
    }
  };

  const removeJobTitle = (title: string) => {
    const updatedTitles = jobTitles.filter(t => t !== title);
    setJobTitles(updatedTitles);
    setValue('job_titles', updatedTitles);
  };

  const handleJobTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addJobTitle();
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    if (jobTitles.length === 0) {
      alert('请至少添加一个职位标题');
      return;
    }

    if (!data.resume_id) {
      alert('请选择一个简历');
      return;
    }

    setIsLoading(true);
    try {
      // 构建请求数据
      const jobAgentRequest = {
        job_titles: jobTitles,
        location: data.location,
        job_required: data.job_required,
        task_description: data.task_description || `智能求职助手：搜索 ${jobTitles.join(', ')} 职位并进行AI匹配分析`,
        resume_id: data.resume_id,
        ai_model: data.ai_model
      };

      console.log('发送 Job Agent 请求:', jobAgentRequest);
      const response = await api.post('/tasks/job-agent', jobAgentRequest);
      console.log('Job Agent 任务创建成功:', response.data);
      
      onTaskCreated?.(response.data);
    } catch (error: any) {
      console.error('Job Agent 任务创建失败:', error);
      
      // 显示详细的错误信息
      let errorMessage = '创建任务失败，请重试';
      if (error?.response?.data?.detail) {
        errorMessage = `创建失败: ${error.response.data.detail}`;
      } else if (error?.message) {
        errorMessage = `创建失败: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const aiModelOptions = [
    { value: 'deepseek', label: 'DeepSeek (推荐)' },
    { value: 'openai', label: 'OpenAI GPT' },
    { value: 'google', label: 'Google Gemini' },
    { value: 'azure_openai', label: 'Azure OpenAI' }
  ];

  const selectedResume = resumes.find(r => r.id === selectedResumeId);

  // 调试信息
  console.log('Debug - isLoading:', isLoading);
  console.log('Debug - jobTitles.length:', jobTitles.length);
  console.log('Debug - selectedResumeId:', selectedResumeId);
  console.log('Debug - button disabled:', isLoading || jobTitles.length === 0 || !selectedResumeId);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-500" />
            <span>+</span>
            <Brain className="h-5 w-5 text-purple-500" />
          </div>
          智能求职助手 (Job Agent)
        </CardTitle>
        <p className="text-muted-foreground">
          一站式服务：自动搜索工作 + AI 简历匹配分析
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 简历选择 */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              选择简历
            </h3>
            
            {loadingResumes ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载简历中...
              </div>
            ) : resumes.length === 0 ? (
              <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                <p>暂无简历，请先创建简历</p>
              </div>
            ) : (
              <div>
                <Select onValueChange={(value) => setValue('resume_id', value)} value={selectedResumeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择要用于匹配的简历" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((resume) => (
                      <SelectItem key={resume.id} value={resume.id}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{resume.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {resume.target_role || '未设置目标职位'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedResume && (
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">已选择：</span>
                      {selectedResume.name} 
                      {selectedResume.target_role && (
                        <span className="text-muted-foreground"> - {selectedResume.target_role}</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 工作搜索条件 */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Search className="h-4 w-4" />
              搜索条件
            </h3>
            
            {/* 职位标题 */}
            <div>
              <label className="block text-sm font-medium mb-1">职位标题 *</label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  onKeyPress={handleJobTitleKeyPress}
                  placeholder="添加职位标题，如：Data Analyst"
                  className="flex-1"
                />
                <Button type="button" onClick={addJobTitle} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {jobTitles.map((title) => (
                  <Badge key={title} variant="secondary" className="flex items-center gap-1">
                    {title}
                    <button
                      type="button"
                      onClick={() => removeJobTitle(title)}
                      className="ml-1 hover:text-destructive"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {jobTitles.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  请添加至少一个职位标题
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">工作地点 *</label>
                <Input
                  {...register('location', { required: '请输入工作地点' })}
                  placeholder="例如：Sydney NSW"
                />
                {errors.location && (
                  <p className="text-sm text-destructive mt-1">{errors.location.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">需要工作数量 *</label>
                <Input
                  {...register('job_required', { 
                    required: '请输入需要的工作数量',
                    min: { value: 1, message: '至少需要1个工作' },
                    max: { value: 50, message: '最多50个工作' }
                  })}
                  type="number"
                  min="1"
                  max="50"
                  placeholder="5"
                />
                {errors.job_required && (
                  <p className="text-sm text-destructive mt-1">{errors.job_required.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* AI 配置 */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI 分析配置
            </h3>
            
            <div>
              <label className="block text-sm font-medium mb-1">AI 模型</label>
              <Select onValueChange={(value) => setValue('ai_model', value)} defaultValue="deepseek">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aiModelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                DeepSeek 提供高质量的中文分析，性价比最高
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">任务描述 (可选)</label>
              <Textarea
                {...register('task_description')}
                placeholder="描述这次任务的目的，例如：寻找数据分析相关职位并分析匹配度"
                rows={3}
              />
            </div>
          </div>

          {/* 任务预览 */}
          {jobTitles.length > 0 && selectedResume && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">任务预览</h4>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">搜索职位：</span>{jobTitles.join(', ')}</p>
                <p><span className="font-medium">搜索地点：</span>{watch('location')}</p>
                <p><span className="font-medium">目标数量：</span>{watch('job_required')} 个工作</p>
                <p><span className="font-medium">匹配简历：</span>{selectedResume.name}</p>
                <p><span className="font-medium">AI 模型：</span>{aiModelOptions.find(o => o.value === watch('ai_model'))?.label}</p>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={isLoading || jobTitles.length === 0 || !selectedResumeId} 
              className="flex-1"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isLoading ? '执行中...' : '开始智能求职'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
